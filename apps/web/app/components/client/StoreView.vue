<script setup lang="ts">
import type { TierLevel } from '~/composables/usePoints';

// Loja da troca de pontos. Por enquanto só mostra os produtos ativos e
// quantos pontos cada um vale — a troca em si ainda não existe.

const TIER_LABELS: Record<TierLevel, string> = {
  standard: 'Standard',
  gold: 'Gold',
  platinum: 'Platinum',
  black: 'Black',
};
const ALL_TIERS_COUNT = Object.keys(TIER_LABELS).length;

const { getCatalog } = useCatalog();

const {
  data: products,
  error,
  refresh,
} = useAsyncData('store-catalog', getCatalog);

const isLoading = computed(() => !products.value && !error.value);

const integer = new Intl.NumberFormat('pt-BR');
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// ---- Filtro por categoria ----

// Vazio = todas.
const category = ref('');

// A API já devolve os produtos ordenados por categoria.
const categories = computed(() => [
  ...new Set((products.value ?? []).map((product) => product.category)),
]);

const visibleProducts = computed(() =>
  (products.value ?? []).filter(
    (product) => !category.value || product.category === category.value,
  ),
);

// Se a categoria escolhida sumir num refresh, volta para todas.
watch(categories, (list) => {
  if (category.value && !list.includes(category.value)) category.value = '';
});

// null quando todos os níveis podem trocar.
function exclusiveLabel(tiers: TierLevel[]): string | null {
  if (tiers.length === ALL_TIERS_COUNT) return null;
  const labels = tiers.map((tier) => TIER_LABELS[tier]);
  const last = labels.pop();
  return labels.length ? `${labels.join(', ')} e ${last}` : (last ?? null);
}
</script>

<template>
  <div class="store">
    <header class="store__header">
      <h1 class="store__title">Troca de Pontos</h1>
      <p class="store__notice">
        A troca chega em breve. Já dá para ver os produtos e quantos pontos cada
        um vale.
      </p>
    </header>

    <div v-if="isLoading" class="store__list" aria-busy="true">
      <div v-for="card in 4" :key="card" class="store__card">
        <div class="store__card__container">
          <SkeletonBlock class="store__image" height="100%" radius="0.8rem" />
        </div>
        <div class="store__body">
          <SkeletonBlock width="5rem" height="0.8rem" />
          <SkeletonBlock width="70%" height="1.2rem" />
          <SkeletonBlock height="2.6rem" />
          <SkeletonBlock width="8rem" height="1.4rem" />
        </div>
      </div>
    </div>

    <section v-else-if="error" class="store__state" role="alert">
      <p class="store__state-title">Não foi possível carregar os produtos</p>
      <button type="button" class="store__retry" @click="refresh()">
        Tentar novamente
      </button>
    </section>

    <section v-else-if="!products?.length" class="store__state">
      <div class="store__icon" aria-hidden="true">
        <svg viewBox="0 0 28 26.5">
          <path
            d="M27.25 18.75H13.8751C12.5173 18.75 11.3287 17.838 10.9773 16.5265L10.6353 15.25L7.3458 2.97354C6.99437 1.66199 5.80584 0.75 4.44802 0.75H0.75M10.6353 15.25H21.6487C22.9102 15.25 24.037 14.4608 24.4681 13.2752L26.2863 8.27523C26.9978 6.31868 25.5488 4.25 23.4669 4.25H11.75M12.75 7.25H23.25M13.75 11.25H21.75M12.25 23.75C12.25 22.55 13.05 21.75 14.25 21.75C15.45 21.75 16.25 22.55 16.25 23.75C16.25 24.95 15.45 25.75 14.25 25.75C13.05 25.75 12.25 24.95 12.25 23.75ZM23.25 23.75C23.25 22.55 24.05 21.75 25.25 21.75C26.45 21.75 27.25 22.55 27.25 23.75C27.25 24.95 26.45 25.75 25.25 25.75C24.05 25.75 23.25 24.95 23.25 23.75Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p class="store__state-title">Em breve</p>
      <p class="store__state-text">
        Em breve você poderá ver aqui os produtos disponíveis para trocar pelos
        seus pontos.
      </p>
    </section>

    <template v-else>
      <div
        v-if="categories.length > 1"
        class="store__filters"
        role="group"
        aria-label="Categorias"
      >
        <button
          type="button"
          class="store__chip"
          :aria-pressed="category === ''"
          @click="category = ''"
        >
          Todos
        </button>
        <button
          v-for="item in categories"
          :key="item"
          type="button"
          class="store__chip"
          :aria-pressed="category === item"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>

      <ul class="store__list">
        <li v-for="product in visibleProducts" :key="product.id">
          <article class="store__card">
            <div class="store__card__container">
              <img
                :src="product.imageUrl"
                alt=""
                class="store__image"
                loading="lazy"
              />
            </div>
            <div class="store__body">
              <p class="store__category">{{ product.category }}</p>
              <h2 class="store__name">{{ product.name }}</h2>

              <p class="store__price">
                <strong>{{ integer.format(product.points) }}</strong> pontos
              </p>
              <p
                v-if="product.allowsPartialPoints"
                class="store__price-partial"
              >
                ou {{ integer.format(product.partialPoints!) }} pontos +
                {{ currency.format(product.partialPrice!) }}
              </p>

              <p
                v-if="exclusiveLabel(product.allowedTiers)"
                class="store__exclusive"
              >
                Exclusivo {{ exclusiveLabel(product.allowedTiers) }}
              </p>

              <button type="button" class="store__cta" disabled>
                Troca em breve
              </button>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped lang="scss">
.store {
  min-height: calc(100dvh - var(--bottom-menu-space, 0px));
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--color-navy);

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.4rem;
    margin: 0;
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
    width: fit-content;
  }

  &__notice {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 0.9rem;
    background: var(--color-maroon-soft);
    color: var(--color-ink);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  &__filters {
    display: flex;
    gap: 0.5rem;
    // Muitas categorias rolam na horizontal em vez de quebrar em linhas.
    overflow-x: auto;
    margin: 0 -1.5rem;
    padding: 0 1.5rem 0.25rem;
    scrollbar-width: none;
  }

  &__chip {
    flex-shrink: 0;
    padding: 0.45rem 0.95rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
    color: var(--color-navy);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;

    &[aria-pressed='true'] {
      border-color: var(--color-navy);
      background: var(--color-navy);
      color: var(--color-cream-high);
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 2px;
    }
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    align-items: stretch;
  }

  &__card {
    overflow: hidden;
    border-radius: 1.2rem;
    background: var(--color-cream-high);
    border: 1.5px solid var(--color-navy-soft);
    height: 100%;
    // Coluna: o corpo ocupa a altura que sobra e o botão vai para o fim,
    // alinhado entre os cards da mesma linha.
    display: flex;
    flex-direction: column;

    &__container {
      padding: 0.5rem;
      height: 7rem;
    }
  }

  &__image {
    display: block;
    margin: auto;
    width: 50%;
    -o-object-fit: cover;
    object-fit: cover;
  }

  &__body {
    flex: 1;
    padding: 1rem 1.1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__category {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-maroon);
  }

  &__name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-navy);
    min-height: 3.5rem;
  }

  &__description {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--color-navy-muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__price {
    margin: 0.4rem 0;
    font-size: 0.95rem;
    color: var(--color-navy);

    strong {
      font-size: 1.35rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
  }

  &__price-partial {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
  }

  &__exclusive {
    align-self: flex-start;
    margin: 0.3rem 0 0;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: var(--color-navy);
    color: var(--color-cream-high);
    font-size: 0.75rem;
    font-weight: 700;
  }

  &__cta {
    // auto empurra o botão para o fim do card; o mínimo de espaço acima dele
    // vem do gap do corpo.
    margin-top: auto;
    padding: 0.7rem 1.2rem;
    border-radius: 999px;
    border: 1.5px dashed var(--color-navy-soft);
    background: transparent;
    color: var(--color-navy-muted);
    font: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: not-allowed;
  }

  &__state {
    margin: auto 0;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    border-radius: 1.2rem;
    background: var(--color-cream-high);
    border: 1.5px solid var(--color-navy-soft);

    &-title {
      margin: 0;
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--color-navy);
    }

    &-text {
      margin: 0;
      max-width: 20rem;
      color: var(--color-navy-muted);
      line-height: 1.5;
    }
  }

  &__retry {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 700;
    color: var(--color-maroon);
    cursor: pointer;
  }

  &__icon {
    width: 4rem;
    height: 4rem;
    margin-bottom: 0.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--color-navy-soft);
    color: var(--color-navy);

    svg {
      width: 1.9rem;
      height: 1.9rem;
    }
  }
}
</style>
