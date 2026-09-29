<script setup lang="ts">
// Cadastro de produto da troca de pontos (somente super-admin).
definePageMeta({ middleware: ['auth', 'super-admin'] });

// Mensagem mostrada uma vez na lista (ver pages/produtos/index.vue).
const flash = useState<string>('products-flash', () => '');

async function handleSaved() {
  flash.value = 'Produto cadastrado.';
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
        <h1 class="products__title">Novo produto</h1>
        <p class="products__subtitle">Produto para troca de pontos</p>
      </div>
      <NuxtLink to="/produtos" class="products__button">Produtos</NuxtLink>
    </header>

    <section class="products__card">
      <AdminProductForm @saved="handleSaved" />
    </section>
  </div>
</template>

<style scoped lang="scss" src="../../assets/css/admin-products.scss"></style>
