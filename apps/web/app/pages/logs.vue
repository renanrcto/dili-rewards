<script setup lang="ts">
import type { LogLevel } from '~/composables/useAdmin';

// Warnings e erros gravados pela API (somente super-admin). A API guarda
// só os últimos 30 dias.
definePageMeta({ middleware: ['auth', 'super-admin'] });

// Mesmo fuso usado pela API para definir "o dia" dos filtros.
const STORE_TIME_ZONE = 'America/Sao_Paulo';

const { getLogs } = useAdmin();

// en-CA formata como YYYY-MM-DD, o valor aceito pelo <input type="date">.
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
}).format(new Date());

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: STORE_TIME_ZONE,
});
const integer = new Intl.NumberFormat('pt-BR');

const LEVEL_LABELS: Record<LogLevel, string> = {
  warn: 'Warning',
  error: 'Error',
};

const filter = reactive({
  from: today,
  to: today,
  level: '' as LogLevel | '',
});
const page = ref(1);

// Mudar um filtro volta para a primeira página.
watch(filter, () => {
  page.value = 1;
});

const { data, error, status, refresh } = useAsyncData(
  'admin-logs',
  () =>
    getLogs({
      from: filter.from || undefined,
      to: filter.to || undefined,
      level: filter.level || undefined,
      page: page.value,
    }),
  { watch: [filter, page] },
);

const isLoading = computed(() => !data.value && !error.value);

const rangeError = computed(() =>
  filter.from && filter.to && filter.from > filter.to
    ? 'A data inicial é depois da final.'
    : '',
);

function goToPage(target: number) {
  page.value = target;
  window.scrollTo({ top: 0 });
}
</script>

<template>
  <div class="logs">
    <header class="logs__header">
      <img
        src="/images/logo-single.svg"
        alt="Dili Cafés Especiais"
        class="logs__logo"
        width="40"
        height="40"
      />
      <div class="logs__heading">
        <h1 class="logs__title">Logs</h1>
        <p class="logs__subtitle">Warnings e erros dos últimos 30 dias</p>
      </div>
      <NuxtLink to="/admin" class="logs__button">Voltar ao painel</NuxtLink>
    </header>

    <section class="logs__card" aria-labelledby="filters-title">
      <h2 id="filters-title" class="visually-hidden">Filtros</h2>
      <div class="logs__filters">
        <label class="logs__field">
          <span class="logs__label">De</span>
          <input
            v-model="filter.from"
            type="date"
            :max="today"
            class="logs__input"
          />
        </label>
        <label class="logs__field">
          <span class="logs__label">Até</span>
          <input
            v-model="filter.to"
            type="date"
            :max="today"
            class="logs__input"
          />
        </label>
        <label class="logs__field">
          <span class="logs__label">Nível</span>
          <select v-model="filter.level" class="logs__input">
            <option value="">Todos</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </label>
      </div>
      <p v-if="rangeError" class="logs__error" role="alert">
        {{ rangeError }}
      </p>
    </section>

    <section class="logs__card" aria-labelledby="list-title" aria-live="polite">
      <div class="logs__card-header">
        <h2 id="list-title" class="logs__card-title">Registros</h2>
        <SkeletonBlock v-if="isLoading" width="5rem" height="0.9rem" />
        <p v-else-if="data" class="logs__count">
          {{ integer.format(data.total) }}
          {{ data.total === 1 ? 'registro' : 'registros' }}
        </p>
      </div>

      <div v-if="isLoading" class="logs__loading" aria-busy="true">
        <SkeletonBlock v-for="row in 5" :key="row" height="3.2rem" />
      </div>

      <p v-else-if="error" class="logs__error" role="alert">
        Não foi possível carregar os logs.
        <button type="button" class="logs__link" @click="refresh()">
          Tentar novamente
        </button>
      </p>

      <template v-else-if="data">
        <p v-if="!data.items.length" class="logs__empty">
          Nenhum log neste período.
        </p>

        <ul
          v-else
          class="logs__list"
          :class="{ 'logs__list--loading': status === 'pending' }"
        >
          <li v-for="log in data.items" :key="log.id">
            <details class="logs__item">
              <summary class="logs__summary">
                <span class="logs__level" :class="`logs__level--${log.level}`">
                  {{ LEVEL_LABELS[log.level] }}
                </span>
                <span class="logs__main">
                  <span class="logs__origin">
                    <template v-if="log.method">
                      <strong>{{ log.statusCode }}</strong>
                      {{ log.method }} {{ log.path }}
                    </template>
                    <template v-else>{{ log.context ?? 'App' }}</template>
                  </span>
                  <span class="logs__message">{{ log.message }}</span>
                </span>
                <time class="logs__time" :datetime="log.createdAt">
                  {{ dateTimeFormat.format(new Date(log.createdAt)) }}
                </time>
              </summary>

              <dl class="logs__details">
                <template v-if="log.context">
                  <dt>Contexto</dt>
                  <dd>{{ log.context }}</dd>
                </template>
                <dt>Mensagem</dt>
                <dd class="logs__pre">{{ log.message }}</dd>
                <template v-if="log.userId">
                  <dt>Usuário</dt>
                  <dd>{{ log.userEmail ?? log.userId }}</dd>
                </template>
                <template v-if="log.ip">
                  <dt>IP</dt>
                  <dd>{{ log.ip }}</dd>
                </template>
                <template v-if="log.userAgent">
                  <dt>User agent</dt>
                  <dd>{{ log.userAgent }}</dd>
                </template>
                <template v-if="log.stack">
                  <dt>Stack</dt>
                  <dd>
                    <pre class="logs__stack">{{ log.stack }}</pre>
                  </dd>
                </template>
              </dl>
            </details>
          </li>
        </ul>

        <nav
          v-if="data.totalPages > 1"
          class="logs__pagination"
          aria-label="Paginação"
        >
          <button
            type="button"
            class="logs__button"
            :disabled="page <= 1 || status === 'pending'"
            @click="goToPage(page - 1)"
          >
            Anterior
          </button>
          <span>Página {{ data.page }} de {{ data.totalPages }}</span>
          <button
            type="button"
            class="logs__button"
            :disabled="page >= data.totalPages || status === 'pending'"
            @click="goToPage(page + 1)"
          >
            Próxima
          </button>
        </nav>
      </template>
    </section>
  </div>
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

.logs {
  min-height: 100dvh;
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }

  &__logo {
    width: 2.5rem;
    height: auto;
  }

  &__heading {
    flex: 1;
    min-width: 10rem;
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.35rem;
    color: var(--color-navy);
    margin: 0;
  }

  &__subtitle,
  &__count {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
  }

  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 1.2rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    background: transparent;
    color: var(--color-navy);
    font: inherit;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:disabled {
      opacity: 0.4;
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

  &__card {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    padding: 1.25rem;
    border-radius: 1.25rem;
    background: var(--color-cream-high);
    box-shadow: 0 0.5rem 1.5rem var(--color-navy-soft);
  }

  &__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__card-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-navy);
  }

  &__filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 1rem;
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
    padding: 0.7rem 0.9rem;
    border-radius: 0.8rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream);
    color: var(--color-ink);
    outline: none;
    min-width: 0;
    transition: border-color 0.2s ease;

    &:focus-visible {
      border-color: var(--color-navy);
    }
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: opacity 0.2s ease;

    &--loading {
      opacity: 0.5;
    }
  }

  &__item {
    border-radius: 0.9rem;
    background: var(--color-cream);

    &[open] .logs__message {
      white-space: normal;
    }
  }

  &__summary {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.8rem 0.9rem;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 2px;
      border-radius: 0.9rem;
    }
  }

  &__level {
    flex-shrink: 0;
    min-width: 4.6rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 800;
    text-align: center;

    &--warn {
      background: var(--color-navy-soft);
      color: var(--color-navy);
    }

    &--error {
      background: var(--color-maroon);
      color: var(--color-cream-high);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__origin {
    font-size: 0.85rem;
    color: var(--color-navy-muted);
    overflow-wrap: anywhere;

    strong {
      color: var(--color-navy);
    }
  }

  &__message {
    font-size: 0.95rem;
    color: var(--color-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    flex-shrink: 0;
    font-size: 0.8rem;
    color: var(--color-navy-muted);
    font-variant-numeric: tabular-nums;
  }

  &__details {
    margin: 0;
    padding: 0 0.9rem 0.9rem;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.4rem 1rem;
    font-size: 0.85rem;

    dt {
      font-weight: 700;
      color: var(--color-navy-muted);
    }

    dd {
      margin: 0;
      min-width: 0;
      color: var(--color-ink);
      overflow-wrap: anywhere;
    }
  }

  &__pre {
    white-space: pre-wrap;
  }

  &__stack {
    margin: 0;
    padding: 0.6rem 0.75rem;
    border-radius: 0.6rem;
    background: var(--color-cream-high);
    font-size: 0.75rem;
    overflow-x: auto;
  }

  &__empty {
    margin: 0;
    padding: 1.5rem 0;
    text-align: center;
    color: var(--color-navy-muted);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.9rem;
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
  }

  &__error {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-maroon);
  }
}

// No celular os detalhes ficam um embaixo do outro.
@media (max-width: 30rem) {
  .logs__summary {
    flex-wrap: wrap;
  }

  // Nível e horário na primeira linha; a mensagem ocupa a de baixo.
  .logs__time {
    margin-left: auto;
  }

  .logs__main {
    order: 1;
    flex-basis: 100%;
  }

  .logs__details {
    grid-template-columns: 1fr;
    gap: 0.15rem;

    dd {
      margin-bottom: 0.4rem;
    }
  }
}
</style>
