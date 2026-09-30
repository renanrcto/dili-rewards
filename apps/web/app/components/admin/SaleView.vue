<script setup lang="ts">
import { renderSVG } from 'uqr';
import { STORE_UNITS, storeUnitLabel } from '~/utils/store-units';
import type { StoreUnit } from '~/utils/store-units';
import type { AdminTab } from '~/utils/tabs';

const emit = defineEmits<{ navigate: [tab: AdminTab] }>();

interface ActiveRescue {
  code: string;
  amount: number;
  unit: StoreUnit;
  expiresAt: number;
}

const { createRescue, getRescueStatus } = usePoints();
const { account } = useAuth();
const isSuperAdmin = computed(() => account.value?.role === 'super_admin');
const requestUrl = useRequestURL();

const isSubmitting = ref(false);
const errorMessage = ref('');
// Aviso mostrado no formulário quando a tela sai do QR Code sozinha (lido
// pelo cliente ou expirado).
const notice = ref<{ kind: 'success' | 'info'; text: string } | null>(null);
const rescue = ref<ActiveRescue | null>(null);
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// Valor em centavos: cada dígito digitado entra pela direita (estilo
// maquininha), então "2", "5", "9", "0" vira 0,02 → 0,25 → 2,59 → 25,90.
// Trabalhar com inteiro evita erro de ponto flutuante até o envio.
const MAX_AMOUNT_DIGITS = 9; // até R$ 9.999.999,99

const amountCents = ref(0);

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amountDisplay = computed(() =>
  amountCents.value ? decimal.format(amountCents.value / 100) : '',
);

function handleAmountInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS);
  amountCents.value = Number(digits) || 0;

  // Reescreve o campo na hora (o Vue não re-renderiza se o valor formatado
  // não mudou, ex.: ao digitar uma letra) e mantém o cursor no fim, já que
  // o preenchimento é sempre da direita para a esquerda.
  input.value = amountDisplay.value;
  input.setSelectionRange(input.value.length, input.value.length);
}

const secondsLeft = computed(() =>
  rescue.value
    ? Math.max(0, Math.ceil((rescue.value.expiresAt - now.value) / 1000))
    : 0,
);
const isExpired = computed(() => !!rescue.value && secondsLeft.value === 0);
const countdown = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = String(secondsLeft.value % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
});

// O QR aponta para o próprio domínio em que o admin está
// (dilirewards.com.br em produção).
const qrSvg = computed(() =>
  rescue.value
    ? renderSVG(`${requestUrl.origin}/resgatar?code=${rescue.value.code}`, {
        border: 2,
        blackColor: '#28374a',
        whiteColor: '#f8f6f5',
      })
    : '',
);

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

function startTimer() {
  stopTimer();
  now.value = Date.now();
  timer = setInterval(() => {
    now.value = Date.now();
    if (isExpired.value) stopTimer();
  }, 1000);
}

// ---- Polling do QR Code ----
// Enquanto o QR está na tela, consulta se o cliente já leu. Assim que é
// lido (ou expira) a tela volta para "Nova venda" e o QR some — senão o
// próximo cliente acabava escaneando um código já usado.

const POLL_INTERVAL_MS = 2500;
let pollTimeout: ReturnType<typeof setTimeout> | undefined;

function stopPolling() {
  if (pollTimeout) clearTimeout(pollTimeout);
  pollTimeout = undefined;
}

function schedulePoll() {
  stopPolling();
  pollTimeout = setTimeout(checkRescue, POLL_INTERVAL_MS);
}

async function checkRescue() {
  const code = rescue.value?.code;
  if (!code) return;
  try {
    const { status, points } = await getRescueStatus(code);
    // O admin pode ter trocado de venda enquanto a requisição voltava.
    if (rescue.value?.code !== code) return;
    if (status === 'redeemed') return finishRescue('redeemed', points);
    if (status === 'expired') return finishRescue('expired');
  } catch {
    // Falha de rede: segue tentando; o cronômetro local cobre a expiração.
    if (rescue.value?.code !== code) return;
  }
  if (isExpired.value) return finishRescue('expired');
  schedulePoll();
}

function finishRescue(outcome: 'redeemed' | 'expired', points?: number | null) {
  const amount = rescue.value?.amount ?? 0;
  handleNewSale();
  if (outcome === 'redeemed') {
    notice.value = {
      kind: 'success',
      text: points
        ? `QR Code lido! ${points} pontos creditados para o cliente.`
        : 'QR Code lido! Pontos creditados para o cliente.',
    };
  } else {
    // Mantém o valor para gerar outro QR com dois toques, se for o caso.
    amountCents.value = Math.round(amount * 100);
    notice.value = {
      kind: 'info',
      text: 'O QR Code expirou sem ser lido. Gere um novo se precisar.',
    };
  }
}

// Ao zerar o cronômetro, confere uma última vez no servidor antes de sair:
// o cliente pode ter lido no último segundo.
watch(isExpired, (expired) => {
  if (!expired) return;
  stopPolling();
  checkRescue();
});

async function generate(amount: number, unit: StoreUnit) {
  errorMessage.value = '';
  notice.value = null;
  isSubmitting.value = true;
  try {
    const created = await createRescue(amount, unit);
    rescue.value = {
      code: created.code,
      amount,
      unit,
      expiresAt: new Date(created.expiresAt).getTime(),
    };
    startTimer();
    schedulePoll();
  } catch (error) {
    errorMessage.value = extractErrorMessage(
      error,
      'Não foi possível gerar o QR Code. Tente novamente.',
    );
  } finally {
    isSubmitting.value = false;
  }
}

// ---- Escolha da unidade ----
// Depois do valor, o admin escolhe a unidade da venda: os pontos seguem a
// promoção vigente nela.

const isPickingUnit = ref(false);
const unitPickerRef = ref<HTMLElement | null>(null);

function handleSubmit() {
  if (amountCents.value <= 0) {
    errorMessage.value = 'Informe o valor da compra.';
    return;
  }
  errorMessage.value = '';
  notice.value = null;
  isPickingUnit.value = true;
}

function handlePickUnit(unit: StoreUnit) {
  isPickingUnit.value = false;
  generate(amountCents.value / 100, unit);
}

function handleUnitPickerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isPickingUnit.value = false;
}

watch(isPickingUnit, async (open) => {
  if (!open) return;
  await nextTick();
  unitPickerRef.value?.querySelector<HTMLButtonElement>('button')?.focus();
});

// A view fica no KeepAlive: ao ir para o painel, o seletor não pode ficar
// aberto esperando a volta, nem o polling rodando em segundo plano.
onDeactivated(() => {
  isPickingUnit.value = false;
  stopPolling();
});

// Na volta, confere na hora: o QR pode ter sido lido nesse meio-tempo.
onActivated(() => {
  if (rescue.value) checkRescue();
});

function handleNewSale() {
  stopTimer();
  stopPolling();
  rescue.value = null;
  amountCents.value = 0;
  errorMessage.value = '';
  notice.value = null;
}

onBeforeUnmount(() => {
  stopTimer();
  stopPolling();
});
</script>

<template>
  <div class="sale">
    <header class="sale__header">
      <button
        v-if="isSuperAdmin"
        type="button"
        class="sale__back"
        @click="emit('navigate', 'dashboard')"
      >
        ← Painel
      </button>
      <img
        src="/images/logo.svg"
        alt="Dili Cafés Especiais"
        class="sale__logo"
        width="96"
        height="71"
      />
      <h1 class="sale__title">Nova venda</h1>
      <p class="sale__subtitle">
        {{
          rescue
            ? 'Peça para o cliente ler o QR Code com a câmera do celular.'
            : 'Digite o valor da compra para gerar o QR Code de pontos.'
        }}
      </p>
    </header>

    <form
      v-if="!rescue"
      class="sale__form"
      method="post"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <label class="sale__field">
        <span class="sale__label">Valor da compra</span>
        <span class="sale__amount-input">
          <span class="sale__currency" aria-hidden="true">R$</span>
          <input
            :value="amountDisplay"
            type="text"
            inputmode="numeric"
            name="purchaseAmount"
            autocomplete="off"
            required
            placeholder="0,00"
            class="sale__input"
            @input="handleAmountInput"
          />
        </span>
      </label>

      <p
        v-if="notice"
        class="sale__notice"
        :class="`sale__notice--${notice.kind}`"
        role="status"
      >
        {{ notice.text }}
      </p>

      <p v-if="errorMessage" class="sale__error" role="alert">
        {{ errorMessage }}
      </p>

      <button type="submit" class="sale__primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Gerando…' : 'Gerar QR Code' }}
      </button>
    </form>

    <section v-else class="sale__qr" aria-live="polite">
      <p class="sale__qr-amount">{{ currency.format(rescue.amount) }}</p>
      <p class="sale__qr-unit">{{ storeUnitLabel(rescue.unit) }}</p>

      <!-- SVG gerado localmente pelo uqr a partir da nossa própria URL -->
      <div
        class="sale__qr-code"
        role="img"
        aria-label="QR Code para o cliente resgatar os pontos"
        v-html="qrSvg"
      />

      <p class="sale__qr-timer">
        Expira em <strong>{{ countdown }}</strong>
      </p>

      <button type="button" class="sale__secondary" @click="handleNewSale">
        Nova venda
      </button>
    </section>

    <Transition name="sale__picker">
      <div
        v-if="isPickingUnit"
        class="sale__picker"
        @click.self="isPickingUnit = false"
        @keydown="handleUnitPickerKeydown"
      >
        <div
          ref="unitPickerRef"
          class="sale__picker-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unit-picker-title"
        >
          <h2 id="unit-picker-title" class="sale__picker-title">
            Qual unidade?
          </h2>
          <p class="sale__picker-amount">
            {{ currency.format(amountCents / 100) }}
          </p>
          <button
            v-for="unit in STORE_UNITS"
            :key="unit.value"
            type="button"
            class="sale__primary"
            @click="handlePickUnit(unit.value)"
          >
            {{ unit.label }}
          </button>
          <button
            type="button"
            class="sale__secondary"
            @click="isPickingUnit = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.sale {
  min-height: 100dvh;
  max-width: 26rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    text-align: center;
  }

  &__back {
    align-self: flex-start;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-maroon);
    text-decoration: none;
    padding: 0;
    background: none;
    font-family: inherit;
    cursor: pointer;
  }

  &__logo {
    width: 3.5rem;
    height: auto;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.4rem;
    color: var(--color-navy);
    margin: 0;
  }

  &__subtitle {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-navy-muted);
  }

  &__form,
  &__qr {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-navy-muted);
  }

  &__amount-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 0.9rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
    transition: border-color 0.2s ease;

    &:focus-within {
      border-color: var(--color-navy);
    }
  }

  &__currency {
    font-weight: 700;
    font-size: 1.4rem;
    color: var(--color-navy-muted);
  }

  &__input {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-weight: 700;
    font-size: 1.4rem;
    border: none;
    background: transparent;
    color: var(--color-ink);
    outline: none;

    &::placeholder {
      color: var(--color-navy-muted);
      opacity: 0.6;
    }
  }

  &__error {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-maroon);
    font-weight: 600;
    text-align: center;
  }

  &__notice {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 0.9rem;
    font-size: 0.9rem;
    font-weight: 600;
    text-align: center;

    &--success {
      background: var(--color-navy);
      color: var(--color-cream-high);
    }

    &--info {
      border: 1.5px solid var(--color-navy-soft);
      color: var(--color-navy-muted);
    }
  }

  &__primary,
  &__secondary {
    padding: 1rem 1.4rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    font: inherit;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }
  }

  &__primary {
    background: var(--color-navy);
    color: var(--color-cream-high);
  }

  &__secondary {
    background: transparent;
    color: var(--color-navy);
  }

  &__qr-amount {
    margin: 0;
    text-align: center;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--color-navy);
  }

  &__qr-unit {
    margin: -0.8rem 0 0;
    text-align: center;
    font-weight: 700;
    color: var(--color-maroon);
  }

  &__picker {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: rgb(40 55 74 / 25%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    &-enter-active,
    &-leave-active {
      transition: opacity 0.2s ease;
    }

    &-enter-from,
    &-leave-to {
      opacity: 0;
    }
  }

  &__picker-dialog {
    width: min(100%, 22rem);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.5rem;
    border-radius: 1.25rem;
    background: var(--color-cream-high);
    box-shadow: 0 0.75rem 2rem var(--color-navy-soft);
  }

  &__picker-title {
    margin: 0;
    text-align: center;
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--color-navy);
  }

  &__picker-amount {
    margin: 0 0 0.25rem;
    text-align: center;
    color: var(--color-navy-muted);
  }

  &__qr-code {
    width: min(100%, 18rem);
    margin: 0 auto;
    padding: 0.75rem;
    border-radius: 1.25rem;
    background: var(--color-cream-high);
    box-shadow: 0 0.5rem 1.5rem var(--color-navy-soft);

    :deep(svg) {
      display: block;
      width: 100%;
      height: auto;
    }
  }

  &__qr-timer {
    margin: 0;
    text-align: center;
    color: var(--color-navy-muted);

    strong {
      color: var(--color-navy);
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
