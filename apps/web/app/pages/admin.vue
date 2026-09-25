<script setup lang="ts">
import type { AdminTab } from '~/utils/tabs';

// Área da equipe: uma única rota para admin e super-admin (ver
// utils/tabs.ts). O admin só registra vendas; o super-admin abre no painel e
// alterna entre ele e a tela de venda.
definePageMeta({ middleware: ['auth', 'admin'] });

const { account } = useAuth();

const tab = ref<AdminTab>(
  account.value?.role === 'super_admin' ? 'dashboard' : 'sale',
);

watch(tab, () => window.scrollTo({ top: 0 }));
</script>

<template>
  <div>
    <!-- KeepAlive preserva um QR Code ainda válido se o super-admin der uma
    olhada no painel e voltar para a venda. -->
    <KeepAlive>
      <AdminDashboardView
        v-if="tab === 'dashboard' && account?.role === 'super_admin'"
        @navigate="tab = $event"
      />
      <AdminSaleView v-else @navigate="tab = $event" />
    </KeepAlive>
  </div>
</template>
