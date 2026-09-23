<script setup lang="ts">
const { login } = useAuth();
const { renderButton: renderGoogleButton } = useGoogleAuth();
// Login com Apple desativado — por enquanto só login local e Google.
// const { signIn: signInWithApple } = useAppleAuth();
const { redirect, goAfterAuth } = useAuthRedirect();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');
const googleButtonEl = ref<HTMLElement | null>(null);

onMounted(() => {
  if (googleButtonEl.value) {
    renderGoogleButton(
      googleButtonEl.value,
      goAfterAuth,
      (message) => (errorMessage.value = message),
    );
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;
  try {
    await goAfterAuth(
      await login({ email: email.value, password: password.value }),
    );
  } catch (error) {
    errorMessage.value = extractErrorMessage(
      error,
      'Não foi possível entrar. Confira seus dados e tente novamente.',
    );
  } finally {
    isSubmitting.value = false;
  }
}

// async function handleAppleSignIn() {
//   errorMessage.value = '';
//   try {
//     await goAfterAuth(await signInWithApple());
//   } catch (error) {
//     errorMessage.value = extractErrorMessage(
//       error,
//       'Não foi possível entrar com a Apple.',
//     );
//   }
// }
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
      <h1 class="auth__title">Bem-vindo de volta</h1>
    </header>

    <form
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

      <label class="auth__field">
        <span class="auth__label">Senha</span>
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          minlength="8"
          placeholder="••••••••"
          class="auth__input"
        />
      </label>

      <p v-if="errorMessage" class="auth__error" role="alert">
        {{ errorMessage }}
      </p>

      <button type="submit" class="auth__submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="auth__divider"><span>ou continue com</span></div>

    <div class="auth__social">
      <div ref="googleButtonEl" class="auth__google-slot" />
      <!-- Login com Apple desativado — por enquanto só login local e Google.
      <button
        type="button"
        class="auth__apple-button"
        @click="handleAppleSignIn"
      >
        <svg viewBox="0 0 24 24" class="auth__apple-icon" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.365 1.43c0 1.14-.464 2.17-1.221 2.937-.86.86-2.144 1.512-3.27 1.42-.14-1.11.466-2.29 1.19-3.022.79-.81 2.17-1.42 3.301-1.335zM20.6 17.24c-.474 1.096-.7 1.585-1.31 2.556-.85 1.36-2.05 3.06-3.54 3.075-1.32.014-1.66-.86-3.45-.85-1.79.01-2.16.865-3.49.85-1.49-.015-2.63-1.545-3.48-2.905-2.39-3.79-2.64-8.245-1.16-10.615.99-1.6 2.54-2.535 3.99-2.535 1.48 0 2.42.86 3.65.86 1.19 0 1.92-.86 3.65-.86 1.29 0 2.66.705 3.64 1.92-3.2 1.75-2.68 6.31.5 8.204z"
          />
        </svg>
        Continuar com a Apple
      </button>
      -->
    </div>

    <p class="auth__footer">
      Ainda não tem conta?
      <NuxtLink
        :to="{ path: '/cadastro', query: redirect ? { redirect } : {} }"
        class="auth__link"
      >
        Criar conta
      </NuxtLink>
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

  &__divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-navy-muted);
    font-size: 0.85rem;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-navy-soft);
    }
  }

  &__social {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__google-slot {
    display: flex;
    justify-content: center;
    min-height: 2.75rem;
  }

  // Login com Apple desativado — por enquanto só login local e Google.
  /*
  &__apple-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.85rem 1.4rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-ink);
    background: var(--color-ink);
    color: var(--color-cream-high);
    font: inherit;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.9;
    }
  }

  &__apple-icon {
    width: 1.15rem;
    height: 1.15rem;
  }
  */

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
