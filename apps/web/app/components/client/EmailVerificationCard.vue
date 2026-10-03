<script setup lang="ts">
import { toast } from 'vue-sonner';

// Alerta de conta pendente no perfil: o cliente digita o código de 6 números
// enviado por e-mail (no cadastro ou pelo botão de reenviar). Enquanto o
// e-mail não é confirmado, a troca de pontos fica bloqueada.

// Mesmo intervalo que a API exige entre dois envios.
const RESEND_COOLDOWN_SECONDS = 60;

const { account, sendEmailVerification, confirmEmail } = useAuth();

const code = ref('');
const error = ref('');
const isConfirming = ref(false);
const isSending = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const canConfirm = computed(
  () => /^\d{6}$/.test(code.value) && !isConfirming.value,
);

// Aceita colar "123 456" ou "123-456" vindo do e-mail.
function handleInput(event: Event) {
  code.value = (event.target as HTMLInputElement).value
    .replace(/\D/g, '')
    .slice(0, 6);
}

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_SECONDS;
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) stopCooldown();
  }, 1000);
}

function stopCooldown() {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = null;
  cooldown.value = 0;
}

onBeforeUnmount(stopCooldown);

async function handleSend() {
  if (isSending.value || cooldown.value) return;
  isSending.value = true;
  error.value = '';
  try {
    await sendEmailVerification();
    toast.success('Código enviado! Confira sua caixa de entrada.');
    startCooldown();
  } catch (err) {
    error.value = extractErrorMessage(
      err,
      'Não foi possível enviar o código. Tente novamente.',
    );
  } finally {
    isSending.value = false;
  }
}

async function handleConfirm() {
  if (!canConfirm.value) return;
  isConfirming.value = true;
  error.value = '';
  try {
    await confirmEmail(code.value);
    toast.success('E-mail confirmado!');
  } catch (err) {
    error.value = extractErrorMessage(
      err,
      'Não foi possível confirmar o código. Tente novamente.',
    );
  } finally {
    isConfirming.value = false;
  }
}
</script>

<template>
  <section class="verify" aria-labelledby="verify-title">
    <div class="verify__header">
      <span class="verify__badge">Conta pendente</span>
      <h2 id="verify-title" class="verify__title">Confirme seu e-mail</h2>
    </div>

    <p class="verify__text">
      Digite o código de 6 números que enviamos para
      <strong class="verify__email">{{ account?.email }}</strong
      >. A troca de pontos só fica liberada depois da confirmação.
    </p>

    <form class="verify__form" @submit.prevent="handleConfirm">
      <label class="visually-hidden" for="verify-code">
        Código de confirmação
      </label>
      <input
        id="verify-code"
        :value="code"
        class="verify__input"
        inputmode="numeric"
        autocomplete="one-time-code"
        placeholder="000000"
        maxlength="7"
        :aria-invalid="!!error"
        aria-describedby="verify-error"
        @input="handleInput"
      />
      <button type="submit" class="verify__confirm" :disabled="!canConfirm">
        {{ isConfirming ? 'Confirmando…' : 'Confirmar' }}
      </button>
    </form>

    <p v-if="error" id="verify-error" class="verify__error" role="alert">
      {{ error }}
    </p>

    <p class="verify__resend">
      Não recebeu? Olhe o spam ou
      <button
        type="button"
        class="verify__link"
        :disabled="isSending || cooldown > 0"
        @click="handleSend"
      >
        <template v-if="cooldown">envie de novo em {{ cooldown }}s</template>
        <template v-else-if="isSending">enviando…</template>
        <template v-else>envie um novo código</template>
      </button>
    </p>
  </section>
</template>

<style scoped lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.verify {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.2rem 1.2rem;
  border-radius: 1.2rem;
  border: 1.5px solid var(--color-maroon);
  background: var(--color-maroon-soft);

  &__header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  &__badge {
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: var(--color-maroon);
    color: var(--color-cream-high);
    font-size: 0.75rem;
    font-weight: 700;
  }

  &__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--color-navy);
  }

  &__text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--color-ink);
  }

  &__email {
    overflow-wrap: anywhere;
  }

  &__form {
    display: flex;
    gap: 0.5rem;
  }

  &__input {
    flex: 1;
    min-width: 0;
    padding: 0.7rem 0.9rem;
    border-radius: 0.8rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
    color: var(--color-ink);
    font: inherit;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    font-variant-numeric: tabular-nums;
    outline: none;
    transition: border-color 0.2s ease;

    &::placeholder {
      color: var(--color-navy-soft);
    }

    &:focus-visible {
      border-color: var(--color-navy);
    }

    &[aria-invalid='true'] {
      border-color: var(--color-maroon);
    }
  }

  &__confirm {
    flex-shrink: 0;
    padding: 0.7rem 1.2rem;
    border-radius: 999px;
    border: none;
    background: var(--color-navy);
    color: var(--color-cream-high);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }
  }

  &__error {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-maroon);
  }

  &__resend {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-navy-muted);
  }

  &__link {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 700;
    color: var(--color-maroon);
    cursor: pointer;

    &:disabled {
      color: var(--color-navy-muted);
      cursor: default;
    }
  }
}
</style>
