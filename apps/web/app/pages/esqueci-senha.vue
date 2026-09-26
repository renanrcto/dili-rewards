<script setup lang="ts">
const { requestPasswordReset } = useAuth();
const route = useRoute();

// O login repassa o e-mail já digitado para não precisar digitar de novo.
const email = ref(
  typeof route.query.email === 'string' ? route.query.email : '',
);
const isSubmitting = ref(false);
const errorMessage = ref('');
const sentTo = ref<string | null>(null);

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await requestPasswordReset(email.value.trim());
    sentTo.value = email.value.trim();
  } catch (error) {
    errorMessage.value = extractErrorMessage(
      error,
      'Não foi possível enviar o e-mail. Tente novamente.',
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <header class="auth__header">
      <img
        src="/images/logo.svg"
        alt="Dili Cafés Especiais"
        class="auth__logo"
        width="96"
        height="71"
      />
      <h1 class="auth__title">Esqueceu a senha?</h1>
      <p v-if="!sentTo" class="auth__subtitle">
        Informe o e-mail da sua conta e enviaremos um link para você criar uma
        nova senha.
      </p>
    </header>

    <div v-if="sentTo" class="auth__notice" role="status">
      <p>
        Se existir uma conta com <strong>{{ sentTo }}</strong
        >, você vai receber um e-mail com o link para criar uma nova senha em
        instantes.
      </p>
      <p>Não encontrou? Confira a caixa de spam.</p>
    </div>

    <form
      v-else
      class="auth__form"
      method="post"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <label class="auth__field">
        <span class="auth__label">E-mail</span>
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="voce@email.com"
          class="auth__input"
        />
      </label>

      <p v-if="errorMessage" class="auth__error" role="alert">
        {{ errorMessage }}
      </p>

      <button type="submit" class="auth__submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Enviando…' : 'Enviar link' }}
      </button>
    </form>

    <p class="auth__footer">
      Lembrou a senha?
      <NuxtLink to="/login" replace class="auth__link"
        >Voltar ao login</NuxtLink
      >
    </p>
  </div>
</template>

<style scoped lang="scss">
.auth {
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

  &__notice {
    padding: 1.1rem 1.25rem;
    border-radius: 0.9rem;
    background: var(--color-cream-high);
    border: 1.5px solid var(--color-navy-soft);
    color: var(--color-navy);
    font-size: 0.95rem;
    line-height: 1.5;

    p {
      margin: 0;
    }

    p + p {
      margin-top: 0.6rem;
      color: var(--color-navy-muted);
    }
  }

  &__form {
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

  &__input {
    font: inherit;
    font-size: 1rem;
    padding: 0.85rem 1rem;
    border-radius: 0.9rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
    color: var(--color-ink);
    outline: none;
    transition: border-color 0.2s ease;

    &::placeholder {
      color: var(--color-navy-muted);
      opacity: 0.6;
    }

    &:focus-visible {
      border-color: var(--color-navy);
    }
  }

  &__error {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-maroon);
    font-weight: 600;
  }

  &__submit {
    margin-top: 0.25rem;
    padding: 1rem 1.4rem;
    border: none;
    border-radius: 999px;
    background: var(--color-navy);
    color: var(--color-cream-high);
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
  }

  &__footer {
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
    margin: 0;
  }

  &__link {
    color: var(--color-maroon);
    font-weight: 700;
  }
}
</style>
