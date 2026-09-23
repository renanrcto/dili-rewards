<script setup lang="ts">
import { renderSVG } from 'uqr';

definePageMeta({ middleware: ['auth', 'admin'] });

interface ActiveRescue {
  code: string;
  amount: number;
  expiresAt: number;
}

const { createRescue } = usePoints();
const requestUrl = useRequestURL();

const isSubmitting = ref(false);
const errorMessage = ref('');
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
    ? renderSVG(
        `${requestUrl.origin}/resgatar?code=${rescue.value.code}`,
        { border: 2, blackColor: '#28374a', whiteColor: '#f8f6f5' },
      )
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

async function generate(amount: number) {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    const created = await createRescue(amount);
    rescue.value = {
      code: created.code,
      amount,
      expiresAt: new Date(created.expiresAt).getTime(),
    };
    startTimer();
  } catch (error) {
    errorMessage.value = extractErrorMessage(
      error,
      'Não foi possível gerar o QR Code. Tente novamente.',
    );
  } finally {
    isSubmitting.value = false;
  }
}

function handleSubmit() {
  if (amountCents.value <= 0) {
    errorMessage.value = 'Informe o valor da compra.';
    return;
  }
  generate(amountCents.value / 100);
}

function handleNewSale() {
  stopTimer();
  rescue.value = null;
  amountCents.value = 0;
  errorMessage.value = '';
}

onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="admin">
    <header class="admin__header">
      <img
        src="/images/logo.svg"
        alt="Dili Cafés Especiais"
        class="admin__logo"
        width="96"
        height="71"
      />
      <h1 class="admin__title">Nova venda</h1>
      <p class="admin__subtitle">
        {{
          rescue
            ? 'Peça para o cliente ler o QR Code com a câmera do celular.'
            : 'Digite o valor da compra para gerar o QR Code de pontos.'
        }}
      </p>
    </header>

    <form
      v-if="!rescue"
      class="admin__form"
      method="post"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <label class="admin__field">
        <span class="admin__label">Valor da compra</span>
        <span class="admin__amount-input">
          <span class="admin__currency" aria-hidden="true">R$</span>
          <input
            :value="amountDisplay"
            type="text"
            inputmode="numeric"
            name="purchaseAmount"
            autocomplete="off"
            required
            placeholder="0,00"
            class="admin__input"
            @input="handleAmountInput"
          />
        </span>
      </label>

      <p v-if="errorMessage" class="admin__error" role="alert">
        {{ errorMessage }}
      </p>

      <button type="submit" class="admin__primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Gerando…' : 'Gerar QR Code' }}
      </button>
    </form>

    <section v-else class="admin__qr" aria-live="polite">
      <p class="admin__qr-amount">{{ currency.format(rescue.amount) }}</p>

      <!-- SVG gerado localmente pelo uqr a partir da nossa própria URL -->
      <div
        class="admin__qr-code"
        :class="{ 'admin__qr-code--expired': isExpired }"
        role="img"
        aria-label="QR Code para o cliente resgatar os pontos"
        v-html="qrSvg"
      />

      <p v-if="!isExpired" class="admin__qr-timer">
        Expira em <strong>{{ countdown }}</strong>
      </p>
      <p v-else class="admin__error" role="alert">Este QR Code expirou.</p>

      <p v-if="errorMessage" class="admin__error" role="alert">
        {{ errorMessage }}
      </p>

      <button
        v-if="isExpired"
        type="button"
        class="admin__primary"
        :disabled="isSubmitting"
        @click="generate(rescue.amount)"
      >
        {{ isSubmitting ? 'Gerando…' : 'Gerar novamente' }}
      </button>
      <button type="button" class="admin__secondary" @click="handleNewSale">
        Nova venda
      </button>
    </section>
  </div>
</template>

<style scoped lang="scss">
.admin {
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

  &__qr-code {
    width: min(100%, 18rem);
    margin: 0 auto;
    padding: 0.75rem;
    border-radius: 1.25rem;
    background: var(--color-cream-high);
    box-shadow: 0 0.5rem 1.5rem var(--color-navy-soft);
    transition: opacity 0.3s ease;

    :deep(svg) {
      display: block;
      width: 100%;
      height: auto;
    }

    &--expired {
      opacity: 0.2;
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
