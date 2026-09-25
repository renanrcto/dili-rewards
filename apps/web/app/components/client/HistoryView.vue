<script setup lang="ts">
import type { PointsHistoryItem, PointsStatus } from '~/composables/usePoints';
import type { ClientTab } from '~/utils/tabs';

const emit = defineEmits<{ navigate: [tab: ClientTab] }>();

const PAGE_SIZE = 20;
// Linhas de skeleton enquanto a primeira página carrega.
const SKELETON_ROWS = 4;

const { getHistory } = usePoints();

// A primeira página carrega ao abrir a aba; as seguintes são anexadas pelo
// "Carregar mais".
const {
  data: firstPage,
  error,
  refresh,
} = useAsyncData('points-history', () => getHistory(1, PAGE_SIZE));

const isLoading = computed(() => !firstPage.value && !error.value);

const extraItems = ref<PointsHistoryItem[]>([]);
const loadedPages = ref(1);
const isLoadingMore = ref(false);
const loadMoreError = ref('');

// Se o cache for invalidado (ex.: depois de um resgate), recomeça do zero.
watch(firstPage, () => {
  extraItems.value = [];
  loadedPages.value = 1;
});

const items = computed(() => [
  ...(firstPage.value?.items ?? []),
  ...extraItems.value,
]);
const total = computed(() => firstPage.value?.total ?? 0);
const hasMore = computed(
  () => loadedPages.value < (firstPage.value?.totalPages ?? 0),
);

async function loadMore() {
  loadMoreError.value = '';
  isLoadingMore.value = true;
  try {
    const next = await getHistory(loadedPages.value + 1, PAGE_SIZE);
    extraItems.value.push(...next.items);
    loadedPages.value = next.page;
  } catch (err) {
    loadMoreError.value = extractErrorMessage(
      err,
      'Não foi possível carregar mais itens.',
    );
  } finally {
    isLoadingMore.value = false;
  }
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const integer = new Intl.NumberFormat('pt-BR');
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const statusLabel: Record<PointsStatus, string> = {
  available: 'Disponível',
  redeemed: 'Utilizado',
  expired: 'Expirado',
};

function expiryText(item: PointsHistoryItem): string {
  const date = dateFormat.format(new Date(item.expiresAt));
  return item.status === 'expired' ? `Expirou em ${date}` : `Expira em ${date}`;
}
</script>

<template>
  <div class="history">
    <header class="history__header">
      <button
        type="button"
        class="history__back"
        aria-label="Voltar ao início"
        @click="emit('navigate', 'home')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 12H4M10 6l-6 6 6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <h1 class="history__title">Histórico de pontos</h1>
      <p v-if="total" class="history__count">
        {{ total }} {{ total === 1 ? 'compra' : 'compras' }}
      </p>
    </header>

    <ul v-if="isLoading" class="history__list" aria-busy="true">
      <li
        v-for="row in SKELETON_ROWS"
        :key="row"
        class="history__item history__item--skeleton"
        aria-hidden="true"
      >
        <div class="history__item-main">
          <SkeletonBlock width="7rem" height="0.8rem" />
          <SkeletonBlock width="9.5rem" height="1.1rem" />
          <SkeletonBlock width="8rem" height="0.8rem" />
        </div>
        <div class="history__item-side">
          <SkeletonBlock width="4rem" height="1.3rem" />
          <SkeletonBlock width="4.5rem" height="1.1rem" radius="999px" />
        </div>
      </li>
    </ul>

    <div v-else-if="error" class="history__empty" role="alert">
      <p>Não foi possível carregar seu histórico.</p>
      <button type="button" class="history__more" @click="refresh()">
        Tentar novamente
      </button>
    </div>

    <div v-else-if="!items.length" class="history__empty">
      <p class="history__empty-title">Nenhum ponto por aqui ainda.</p>
      <p>
        Na sua próxima compra, peça o QR Code no caixa e leia com a câmera do
        celular.
      </p>
    </div>

    <template v-else>
      <ul class="history__list">
        <li
          v-for="item in items"
          :key="item.id"
          class="history__item"
          :class="`history__item--${item.status}`"
        >
          <div class="history__item-main">
            <p class="history__item-date">
              {{ dateFormat.format(new Date(item.createdAt)) }}
              <span>· {{ timeFormat.format(new Date(item.createdAt)) }}</span>
            </p>
            <p class="history__item-purchase">
              Compra de {{ currency.format(item.purchaseAmount) }}
            </p>
            <p v-if="item.status !== 'redeemed'" class="history__item-expiry">
              {{ expiryText(item) }}
            </p>
          </div>
          <div class="history__item-side">
            <p class="history__item-points">
              +{{ integer.format(item.points) }}
              <span>pts</span>
            </p>
            <span class="history__badge">{{ statusLabel[item.status] }}</span>
          </div>
        </li>
      </ul>

      <p v-if="loadMoreError" class="history__error" role="alert">
        {{ loadMoreError }}
      </p>

      <button
        v-if="hasMore"
        type="button"
        class="history__more"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? 'Carregando…' : 'Carregar mais' }}
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.history {
  min-height: calc(100dvh - var(--bottom-menu-space, 0px));
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--color-navy);

  &__header {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 0.75rem;
  }

  &__back {
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--color-navy-soft);
    color: var(--color-navy);
    cursor: pointer;

    svg {
      width: 1.3rem;
      height: 1.3rem;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 2px;
    }
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.3rem;
    background: linear-gradient(
      to right,
      var(--color-navy),
      var(--color-maroon)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    justify-self: start;
  }

  &__count {
    grid-column: 2;
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-navy-muted);
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.1rem;
    border-radius: 1.1rem;
    background: var(--color-cream-high);
    border: 1.5px solid var(--color-navy-soft);

    &-main,
    &-side {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    &-side {
      align-items: flex-end;
      flex-shrink: 0;
      gap: 0.35rem;
    }

    &-date {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-navy-muted);
      text-transform: capitalize;

      span {
        text-transform: none;
      }
    }

    &-purchase {
      margin: 0;
      font-weight: 700;
      color: var(--color-ink);
    }

    &-expiry {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-navy-muted);
    }

    &-points {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--color-navy);
      white-space: nowrap;

      span {
        font-size: 0.8rem;
        font-weight: 700;
      }
    }

    // Espaço extra entre os blocos para a linha de skeleton ter a mesma
    // altura de uma linha carregada.
    &--skeleton &-main,
    &--skeleton &-side {
      gap: 0.55rem;
    }

    &--expired,
    &--redeemed {
      .history__item-points {
        color: var(--color-navy-muted);
        text-decoration: line-through;
        text-decoration-thickness: 1.5px;
      }
    }
  }

  &__badge {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--color-navy-soft);
    color: var(--color-navy);

    .history__item--expired & {
      background: var(--color-maroon-soft);
      color: var(--color-maroon);
    }
  }

  &__empty {
    margin: auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    color: var(--color-navy-muted);

    &-title {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--color-navy);
    }
  }

  &__error {
    margin: 0;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-maroon);
  }

  &__more {
    align-self: center;
    padding: 0.75rem 1.6rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    background: transparent;
    color: var(--color-navy);
    font: inherit;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }
  }
}
</style>
