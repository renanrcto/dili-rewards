<script setup lang="ts">
import type { ConversionRate } from '~/composables/useAdmin';
import type { AdminTab } from '~/utils/tabs';

const emit = defineEmits<{ navigate: [tab: AdminTab] }>();

// Mesmo fuso usado pela API para definir "o dia" do painel.
const STORE_TIME_ZONE = 'America/Sao_Paulo';
const MAX_DURATION_HOURS = 720;

const { logout } = useAuth();
const { getDailyPoints, getRates, createRate, deactivateRate } = useAdmin();

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const integer = new Intl.NumberFormat('pt-BR');
const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STORE_TIME_ZONE,
});
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STORE_TIME_ZONE,
});
const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  // A data do relatório é um dia "puro" (YYYY-MM-DD); formatada em UTC
  // para não voltar um dia por causa do fuso.
  timeZone: 'UTC',
});

// ---- Registros de pontos do dia ----

// Vazio = hoje (definido pela API no fuso da loja).
const selectedDate = ref('');

const {
  data: report,
  error: reportError,
  status: reportStatus,
  refresh: refreshReport,
} = useAsyncData(
  'admin-daily-points',
  () => getDailyPoints(selectedDate.value || undefined),
  { watch: [selectedDate] },
);

const isReportLoading = computed(() => !report.value && !reportError.value);

const reportDateLabel = computed(() =>
  report.value
    ? longDate.format(new Date(`${report.value.date}T00:00:00Z`))
    : '',
);

// ---- Taxa de conversão ----

const {
  data: rates,
  error: ratesError,
  refresh: refreshRates,
} = useAsyncData('admin-rates', getRates);

const isRatesLoading = computed(() => !rates.value && !ratesError.value);

const currentRate = computed(() => rates.value?.[0] ?? null);
// Taxa para a qual o programa volta quando os boosts expiram.
const defaultRate = computed(
  () => rates.value?.find((rate) => rate.expiresAt === null) ?? null,
);
const boosts = computed(
  () => rates.value?.filter((rate) => rate.expiresAt !== null) ?? [],
);

const form = reactive({
  pointsPerReal: '' as number | '',
  temporary: true,
  durationHours: 3 as number | '',
  observation: '',
});
const isSaving = ref(false);
const formError = ref('');
const formSuccess = ref('');
const endingId = ref<string | null>(null);
const listError = ref('');

async function handleCreateRate() {
  formError.value = '';
  formSuccess.value = '';

  const pointsPerReal = Number(form.pointsPerReal);
  if (!Number.isInteger(pointsPerReal) || pointsPerReal < 1) {
    formError.value = 'Informe quantos pontos cada real vale (número inteiro).';
    return;
  }
  const durationHours = Number(form.durationHours);
  if (
    form.temporary &&
    (!Number.isInteger(durationHours) ||
      durationHours < 1 ||
      durationHours > MAX_DURATION_HOURS)
  ) {
    formError.value = `A duração deve ser de 1 a ${MAX_DURATION_HOURS} horas.`;
    return;
  }

  isSaving.value = true;
  try {
    const created = await createRate({
      pointsPerReal,
      durationHours: form.temporary ? durationHours : undefined,
      observation: form.observation.trim() || undefined,
    });
    formSuccess.value = created.expiresAt
      ? `Promoção ativa até ${dateTimeFormat.format(new Date(created.expiresAt))}.`
      : 'Nova taxa padrão ativa.';
    form.pointsPerReal = '';
    form.observation = '';
    await refreshRates();
  } catch (error) {
    formError.value = extractErrorMessage(
      error,
      'Não foi possível salvar a taxa. Tente novamente.',
    );
  } finally {
    isSaving.value = false;
  }
}

async function handleEndBoost(rate: ConversionRate) {
  listError.value = '';
  endingId.value = rate.id;
  try {
    await deactivateRate(rate.id);
    await refreshRates();
  } catch (error) {
    listError.value = extractErrorMessage(
      error,
      'Não foi possível encerrar a promoção.',
    );
  } finally {
    endingId.value = null;
  }
}

async function handleLogout() {
  logout();
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <div class="panel">
    <header class="panel__header">
      <img
        src="/images/logo-single.svg"
        alt="Dili Cafés Especiais"
        class="panel__logo"
        width="40"
        height="40"
      />
      <div class="panel__heading">
        <h1 class="panel__title">Painel Dili Rewards</h1>
        <p class="panel__subtitle">Gestão do programa de pontos</p>
      </div>
      <nav class="panel__actions">
        <button
          type="button"
          class="panel__button panel__button--primary"
          @click="emit('navigate', 'sale')"
        >
          Nova venda
        </button>
        <button type="button" class="panel__button" @click="handleLogout">
          Sair
        </button>
      </nav>
    </header>

    <section class="panel__card" aria-labelledby="daily-title">
      <div class="panel__card-header">
        <div>
          <h2 id="daily-title" class="panel__card-title">Pontos do dia</h2>
          <SkeletonBlock
            v-if="isReportLoading"
            class="panel__card-subtitle"
            width="11rem"
            height="0.9rem"
          />
          <p v-else class="panel__card-subtitle">{{ reportDateLabel }}</p>
        </div>
        <label class="panel__date">
          <span class="visually-hidden">Data</span>
          <input
            :value="selectedDate || report?.date"
            type="date"
            class="panel__input"
            @change="selectedDate = ($event.target as HTMLInputElement).value"
          />
        </label>
      </div>

      <div v-if="isReportLoading" class="panel__loading" aria-busy="true">
        <dl class="panel__stats" aria-hidden="true">
          <div
            v-for="label in ['Vendas', 'Valor total', 'Pontos creditados']"
            :key="label"
            class="panel__stat"
          >
            <dt>{{ label }}</dt>
            <dd><SkeletonBlock width="5rem" height="1.6rem" /></dd>
          </div>
        </dl>
        <SkeletonBlock v-for="row in 3" :key="row" height="2.2rem" />
      </div>

      <p v-else-if="reportError" class="panel__error" role="alert">
        Não foi possível carregar os registros.
        <button type="button" class="panel__link" @click="refreshReport()">
          Tentar novamente
        </button>
      </p>

      <template v-else-if="report">
        <dl class="panel__stats">
          <div class="panel__stat">
            <dt>Vendas</dt>
            <dd>{{ integer.format(report.totals.credits) }}</dd>
          </div>
          <div class="panel__stat">
            <dt>Valor total</dt>
            <dd>{{ currency.format(report.totals.purchaseAmount) }}</dd>
          </div>
          <div class="panel__stat">
            <dt>Pontos creditados</dt>
            <dd>{{ integer.format(report.totals.points) }}</dd>
          </div>
        </dl>

        <p v-if="!report.items.length" class="panel__empty">
          Nenhum ponto creditado neste dia.
        </p>

        <div
          v-else
          class="panel__table-wrap"
          :class="{ 'panel__table-wrap--loading': reportStatus === 'pending' }"
        >
          <table class="panel__table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Horário</th>
                <th scope="col" class="panel__num">Valor da compra</th>
                <th scope="col" class="panel__num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.items" :key="item.id">
                <td>{{ item.userName }}</td>
                <td>{{ timeFormat.format(new Date(item.createdAt)) }}</td>
                <td class="panel__num">
                  {{ currency.format(item.purchaseAmount) }}
                </td>
                <td class="panel__num">{{ integer.format(item.points) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <section class="panel__card" aria-labelledby="rates-title">
      <div class="panel__card-header">
        <div>
          <h2 id="rates-title" class="panel__card-title">Taxa de conversão</h2>
          <p class="panel__card-subtitle">Pontos creditados por real gasto</p>
        </div>
      </div>

      <SkeletonBlock v-if="isRatesLoading" height="5.3rem" radius="0.9rem" />

      <p v-else-if="ratesError" class="panel__error" role="alert">
        Não foi possível carregar as taxas.
        <button type="button" class="panel__link" @click="refreshRates()">
          Tentar novamente
        </button>
      </p>

      <template v-else>
        <div v-if="currentRate" class="panel__current">
          <p class="panel__current-value">
            {{ integer.format(currentRate.pointsPerReal) }}
            <span>pontos por R$ 1</span>
          </p>
          <p class="panel__current-note">
            <template v-if="currentRate.expiresAt">
              Promoção até
              {{ dateTimeFormat.format(new Date(currentRate.expiresAt)) }}
              <template v-if="defaultRate">
                — depois volta para
                {{ integer.format(defaultRate.pointsPerReal) }} pontos
              </template>
            </template>
            <template v-else>Taxa padrão, sem prazo</template>
          </p>
        </div>

        <ul v-if="boosts.length" class="panel__boosts">
          <li v-for="rate in boosts" :key="rate.id" class="panel__boost">
            <div>
              <strong>{{ integer.format(rate.pointsPerReal) }} pts/R$</strong>
              até {{ dateTimeFormat.format(new Date(rate.expiresAt!)) }}
              <span v-if="rate.observation" class="panel__boost-note">
                {{ rate.observation }}
              </span>
            </div>
            <button
              type="button"
              class="panel__link"
              :disabled="endingId === rate.id"
              @click="handleEndBoost(rate)"
            >
              {{ endingId === rate.id ? 'Encerrando…' : 'Encerrar' }}
            </button>
          </li>
        </ul>
        <p v-if="listError" class="panel__error" role="alert">
          {{ listError }}
        </p>
      </template>

      <form class="panel__form" novalidate @submit.prevent="handleCreateRate">
        <h3 class="panel__form-title">Nova taxa</h3>

        <div class="panel__toggle" role="radiogroup" aria-label="Tipo de taxa">
          <label>
            <input v-model="form.temporary" type="radio" :value="true" />
            Promoção por tempo limitado
          </label>
          <label>
            <input v-model="form.temporary" type="radio" :value="false" />
            Nova taxa padrão
          </label>
        </div>

        <div class="panel__fields">
          <label class="panel__field">
            <span class="panel__label">Pontos por R$ 1</span>
            <input
              v-model.number="form.pointsPerReal"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              required
              :placeholder="String(currentRate?.pointsPerReal ?? 100)"
              class="panel__input"
            />
          </label>

          <label v-if="form.temporary" class="panel__field">
            <span class="panel__label">Duração (horas)</span>
            <input
              v-model.number="form.durationHours"
              type="number"
              inputmode="numeric"
              min="1"
              :max="MAX_DURATION_HOURS"
              step="1"
              required
              class="panel__input"
            />
          </label>
        </div>

        <label class="panel__field">
          <span class="panel__label">Observação (opcional)</span>
          <input
            v-model="form.observation"
            type="text"
            maxlength="500"
            placeholder="Ex.: Happy hour de sexta"
            class="panel__input"
          />
        </label>

        <p class="panel__hint">
          <template v-if="form.temporary">
            Ao fim do prazo, a taxa volta sozinha para a padrão ({{
              integer.format(defaultRate?.pointsPerReal ?? 100)
            }}
            pontos por real).
          </template>
          <template v-else>
            A nova taxa substitui a padrão atual e vale até ser trocada.
          </template>
        </p>

        <p v-if="formError" class="panel__error" role="alert">
          {{ formError }}
        </p>
        <p v-if="formSuccess" class="panel__success" role="status">
          {{ formSuccess }}
        </p>

        <button
          type="submit"
          class="panel__button panel__button--primary"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Salvando…' : 'Aplicar taxa' }}
        </button>
      </form>
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

.panel {
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
  &__card-subtitle {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
  }

  &__card-subtitle::first-letter {
    text-transform: uppercase;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
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

    &--primary {
      background: var(--color-navy);
      color: var(--color-cream-high);
    }

    &:disabled {
      opacity: 0.6;
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
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__card-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-navy);
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

  &__stats {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.75rem;
  }

  &__stat {
    padding: 0.85rem 1rem;
    border-radius: 0.9rem;
    background: var(--color-cream);

    dt {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-navy-muted);
    }

    dd {
      margin: 0.2rem 0 0;
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--color-navy);
      font-variant-numeric: tabular-nums;
    }
  }

  &__table-wrap {
    overflow-x: auto;
    transition: opacity 0.2s ease;

    &--loading {
      opacity: 0.5;
    }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;

    th,
    td {
      padding: 0.7rem 0.6rem;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-navy-soft);
    }

    th {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-navy-muted);
    }

    td {
      color: var(--color-ink);
      font-variant-numeric: tabular-nums;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }
  }

  &__num {
    text-align: right !important;
  }

  &__empty {
    margin: 0;
    padding: 1.5rem 0;
    text-align: center;
    color: var(--color-navy-muted);
  }

  &__current {
    padding: 1rem 1.1rem;
    border-radius: 0.9rem;
    background: var(--color-navy);
    color: var(--color-cream-high);
  }

  &__current-value {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;

    span {
      font-size: 1rem;
      font-weight: 600;
    }
  }

  &__current-note {
    margin: 0.2rem 0 0;
    font-size: 0.9rem;
    opacity: 0.85;
  }

  &__boosts {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__boost {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.7rem 0.9rem;
    border-radius: 0.8rem;
    background: var(--color-maroon-soft);
    color: var(--color-ink);
    font-size: 0.95rem;
  }

  &__boost-note {
    display: block;
    font-size: 0.85rem;
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

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1.1rem;
    border-top: 1px solid var(--color-navy-soft);
  }

  &__form-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-navy);
  }

  &__toggle {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    font-size: 0.95rem;
    color: var(--color-ink);

    label {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
    }

    input {
      accent-color: var(--color-navy);
    }
  }

  &__fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
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

  &__hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-navy-muted);
  }

  &__error,
  &__success {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  &__error {
    color: var(--color-maroon);
  }

  &__success {
    color: var(--color-navy);
  }
}
</style>
