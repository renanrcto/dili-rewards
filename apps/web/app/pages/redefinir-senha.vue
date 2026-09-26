<script setup lang="ts">
const { resetPassword } = useAuth();
const { goAfterAuth } = useAuthRedirect();
const route = useRoute();

// Token que veio no link do e-mail (/redefinir-senha?token=...).
const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : '',
);

const password = ref('');
const confirmPassword = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';

  if (password.value.length < 8) {
    errorMessage.value = 'A senha precisa ter pelo menos 8 caracteres.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não coincidem.';
    return;
  }

  isSubmitting.value = true;
  try {
    // A API já devolve uma sessão: entra direto no app com a senha nova.
    await goAfterAuth(
      await resetPassword({ token: token.value, password: password.value }),
    );
  } catch (error) {
    errorMessage.value = extractErrorMessage(
      error,
      'Não foi possível redefinir sua senha. Tente novamente.',
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
      <h1 class="auth__title">Criar nova senha</h1>
      <p v-if="token" class="auth__subtitle">
        Escolha uma senha com pelo menos 8 caracteres.
      </p>
    </header>

    <p v-if="!token" class="auth__error" role="alert">
      Este link é inválido. Peça um novo para redefinir sua senha.
    </p>

    <form
      v-else
      class="auth__form"
      method="post"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <label class="auth__field">
        <span class="auth__label">Nova senha</span>
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          required
          minlength="8"
          maxlength="72"
          placeholder="••••••••"
          class="auth__input"
        />
      </label>

      <label class="auth__field">
        <span class="auth__label">Confirmar nova senha</span>
        <input
          v-model="confirmPassword"
          type="password"
          name="confirmPassword"
          autocomplete="new-password"
          required
          minlength="8"
          maxlength="72"
          placeholder="••••••••"
          class="auth__input"
        />
      </label>

      <p v-if="errorMessage" class="auth__error" role="alert">
        {{ errorMessage }}
      </p>

      <button type="submit" class="auth__submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Salvando…' : 'Salvar nova senha' }}
      </button>
    </form>

    <p class="auth__footer">
      <NuxtLink to="/esqueci-senha" replace class="auth__link">
        Pedir um novo link
      </NuxtLink>
      ·
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
