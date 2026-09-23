<script setup lang="ts">
// TODO: página ainda não implementada — existe para o MenuBottom não cair
// em 404.
definePageMeta({ middleware: 'auth', bottomMenu: true });
</script>

<template>
  <div class="placeholder">
    <h1>Histórico de pontos</h1>
    <p>Em breve.</p>
  </div>
</template>

<style scoped lang="scss">
.placeholder {
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem;
  color: var(--color-navy);

  h1 {
    font-size: 1.4rem;
    font-weight: 700;
  }
}
</style>
