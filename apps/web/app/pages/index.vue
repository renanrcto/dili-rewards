<script setup lang="ts">
import type { ClientTab } from '~/utils/tabs';

// Área do cliente: uma única rota com as abas do MenuBottom (ver
// utils/tabs.ts). Cada aba carrega os próprios dados e mostra skeleton até
// eles chegarem.
definePageMeta({ middleware: 'auth' });

const tab = ref<ClientTab>('home');

// Como não há troca de rota, o scroll não volta sozinho para o topo.
watch(tab, () => window.scrollTo({ top: 0 }));
</script>

<template>
  <div class="client">
    <!-- KeepAlive mantém as abas já abertas montadas: voltar para uma delas
    é instantâneo e não recarrega os dados. -->
    <KeepAlive>
      <ClientHomeView v-if="tab === 'home'" />
      <ClientHistoryView
        v-else-if="tab === 'history'"
        @navigate="tab = $event"
      />
      <ClientStoreView v-else-if="tab === 'store'" />
      <ClientProfileView v-else />
    </KeepAlive>

    <MenuBottom v-model="tab" />
  </div>
</template>

<style scoped lang="scss">
.client {
  // altura do menu + distância até a borda inferior + respiro, para o
  // conteúdo final da aba não ficar escondido atrás do menu fixo.
  --bottom-menu-space: calc(4.3125rem + 2rem);
  padding-bottom: var(--bottom-menu-space);
}
</style>
