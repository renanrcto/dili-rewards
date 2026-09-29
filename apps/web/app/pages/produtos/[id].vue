<script setup lang="ts">
// Edição de produto da troca de pontos (somente super-admin).
definePageMeta({ middleware: ['auth', 'super-admin'] });

const route = useRoute();
const id = route.params.id as string;

const { getProduct } = useAdmin();

const {
  data: product,
  error,
  refresh,
} = useAsyncData(`admin-product-${id}`, () => getProduct(id));

const isLoading = computed(() => !product.value && !error.value);
const isNotFound = computed(
  () => (error.value as { statusCode?: number } | null)?.statusCode === 404,
);

// Mensagem mostrada uma vez na lista (ver pages/produtos/index.vue).
const flash = useState<string>('products-flash', () => '');

async function handleSaved() {
  flash.value = 'Alterações salvas.';
  await navigateTo('/produtos');
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
        <h1 class="products__title">Editar produto</h1>
        <p class="products__subtitle">Produto para troca de pontos</p>
      </div>
      <NuxtLink to="/produtos" class="products__button">Produtos</NuxtLink>
    </header>

    <section class="products__card">
      <div v-if="isLoading" class="products__loading" aria-busy="true">
        <SkeletonBlock width="7.5rem" height="7.5rem" radius="1rem" />
        <SkeletonBlock v-for="row in 4" :key="row" height="3rem" />
      </div>

      <p v-else-if="isNotFound" class="products__empty">
        Produto não encontrado.
      </p>

      <p v-else-if="error" class="products__error" role="alert">
        Não foi possível carregar o produto.
        <button type="button" class="products__link" @click="refresh()">
          Tentar novamente
        </button>
      </p>

      <AdminProductForm v-else-if="product" :product @saved="handleSaved" />
    </section>
  </div>
</template>

<style scoped lang="scss" src="../../assets/css/admin-products.scss"></style>
