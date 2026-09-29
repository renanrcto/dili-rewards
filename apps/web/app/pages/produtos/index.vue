<script setup lang="ts">
import type { ProductTier } from '~/composables/useAdmin';

// Produtos da troca de pontos (somente super-admin).
definePageMeta({ middleware: ['auth', 'super-admin'] });

const TIER_LABELS: Record<ProductTier, string> = {
  standard: 'Standard',
  gold: 'Gold',
  platinum: 'Platinum',
  black: 'Black',
};
const ALL_TIERS_COUNT = Object.keys(TIER_LABELS).length;

const { getProducts, getProductCategories } = useAdmin();

const integer = new Intl.NumberFormat('pt-BR');
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const rate = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

// Vem do cadastro/edição; mostrada só nesta visita à lista.
const flash = useState<string>('products-flash', () => '');
const message = flash.value;
flash.value = '';

// Vazio = todas as categorias.
const category = ref('');

const {
  data: products,
  error,
  status,
  refresh,
} = useAsyncData(
  'admin-products',
  () => getProducts(category.value || undefined),
  { watch: [category] },
);

const { data: categories } = useAsyncData(
  'admin-product-categories',
  getProductCategories,
  { default: () => [] as string[] },
);

const isLoading = computed(() => !products.value && !error.value);

function tiersLabel(tiers: ProductTier[]): string {
  return tiers.length === ALL_TIERS_COUNT
    ? 'Todos os níveis'
    : tiers.map((tier) => TIER_LABELS[tier]).join(', ');
}
</script>

<template>
  <div class="products">
    <header class="products__header">
      <img
        src="/images/logo-single.svg"
        alt="Dili Cafés Especiais"
        class="products__logo"
        width="40"
        height="40"
      />
      <div class="products__heading">
        <h1 class="products__title">Produtos</h1>
        <p class="products__subtitle">Catálogo da troca de pontos</p>
      </div>
      <NuxtLink to="/admin" class="products__button">Voltar ao painel</NuxtLink>
    </header>

    <p v-if="message" class="products__success" role="status">
      {{ message }}
    </p>

    <section class="products__card" aria-labelledby="list-title">
      <div class="products__card-header">
        <h2 id="list-title" class="products__card-title">Cadastrados</h2>
        <NuxtLink
          to="/produtos/novo"
          class="products__button products__button--primary"
        >
          Novo produto
        </NuxtLink>
      </div>

      <label v-if="categories.length" class="products__filter">
        <span class="products__filter-label">Categoria</span>
        <select v-model="category" class="products__input">
          <option value="">Todas</option>
          <option v-for="item in categories" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>

      <div v-if="isLoading" class="products__loading" aria-busy="true">
        <SkeletonBlock v-for="row in 3" :key="row" height="5rem" />
      </div>

      <p v-else-if="error" class="products__error" role="alert">
        Não foi possível carregar os produtos.
        <button type="button" class="products__link" @click="refresh()">
          Tentar novamente
        </button>
      </p>

      <template v-else-if="products">
        <p v-if="!products.length" class="products__empty">
          {{
            category
              ? 'Nenhum produto nesta categoria.'
              : 'Nenhum produto cadastrado ainda.'
          }}
        </p>

        <ul
          v-else
          class="products__list"
          :class="{ 'products__list--loading': status === 'pending' }"
        >
          <li v-for="product in products" :key="product.id">
            <NuxtLink :to="`/produtos/${product.id}`" class="products__item">
              <img
                :src="product.imageUrl"
                alt=""
                class="products__thumb"
                width="64"
                height="64"
                loading="lazy"
              />
              <span class="products__main">
                <span class="products__name">{{ product.name }}</span>
                <span class="products__detail">{{ product.category }}</span>
                <span class="products__detail">
                  {{ integer.format(product.points) }} pontos
                  <template v-if="product.allowsPartialPoints">
                    ou {{ integer.format(product.partialPoints!) }} pontos +
                    {{ currency.format(product.partialPrice!) }}
                  </template>
                </span>
                <span class="products__detail">
                  {{ currency.format(product.finalPrice) }} ·
                  {{ rate.format(product.conversionRate) }}% em pontos
                  <template v-if="product.cost !== null">
                    · custo {{ currency.format(product.cost) }}
                  </template>
                </span>
                <span class="products__detail">
                  {{ tiersLabel(product.allowedTiers) }}
                </span>
              </span>
              <span
                class="products__status"
                :class="`products__status--${product.status}`"
              >
                {{ product.status === 'active' ? 'Ativo' : 'Inativo' }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<style scoped lang="scss" src="../../assets/css/admin-products.scss"></style>
