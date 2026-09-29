<script setup lang="ts">
import type {
  Product,
  ProductInput,
  ProductStatus,
  ProductTier,
} from '~/composables/useAdmin';
import {
  MAX_CONVERSION_RATE,
  MIN_CONVERSION_RATE,
  calculatePartial,
  calculatePoints,
} from '~/utils/product-pricing';

// Formulário de cadastro/edição de produto da troca de pontos. Sem
// `product`, cadastra um novo.
const props = defineProps<{ product?: Product }>();
const emit = defineEmits<{ saved: [product: Product] }>();

// Mesmo fuso usado pela API para as datas do painel.
const STORE_TIME_ZONE = 'America/Sao_Paulo';
// Limite e formatos aceitos pela API (POST /admin/products/image).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const TIERS: { value: ProductTier; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'black', label: 'Black' },
];

const {
  createProduct,
  updateProduct,
  uploadProductImage,
  getProductCategories,
} = useAdmin();

// Sugestões do campo categoria; se falhar, o campo continua livre.
const { data: categories } = useAsyncData(
  'admin-product-categories',
  getProductCategories,
  { default: () => [] as string[] },
);

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STORE_TIME_ZONE,
});
const priceFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const rateFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('pt-BR');
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const form = reactive({
  name: props.product?.name ?? '',
  category: props.product?.category ?? '',
  description: props.product?.description ?? '',
  // Texto para aceitar vírgula como separador decimal.
  finalPrice:
    props.product != null ? priceFormat.format(props.product.finalPrice) : '',
  conversionRate:
    props.product != null
      ? rateFormat.format(props.product.conversionRate)
      : '',
  status: (props.product?.status ?? 'active') as ProductStatus,
  allowsPartialPoints: props.product?.allowsPartialPoints ?? false,
  cost:
    props.product?.cost != null ? priceFormat.format(props.product.cost) : '',
  allowedTiers: [
    ...(props.product?.allowedTiers ?? TIERS.map((tier) => tier.value)),
  ] as ProductTier[],
});

// ---- Imagem ----
// O arquivo só vai para o R2 ao salvar, para não deixar imagens órfãs no
// bucket quando o formulário é abandonado.

const imageFile = ref<File | null>(null);
// URL de uma imagem nova já enviada ao R2 mas ainda não gravada no produto.
const uploadedImageUrl = ref<string | null>(null);
const localPreviewUrl = ref<string | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const imagePreview = computed(
  () => localPreviewUrl.value ?? props.product?.imageUrl ?? null,
);

function setLocalPreview(file: File | null) {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
  localPreviewUrl.value = file ? URL.createObjectURL(file) : null;
}

onBeforeUnmount(() => setLocalPreview(null));

function handleImageChange(event: Event) {
  formError.value = '';
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (!file) return;

  if (!IMAGE_TYPES.includes(file.type)) {
    formError.value = 'A imagem deve ser JPG, PNG ou WebP.';
  } else if (file.size > MAX_IMAGE_BYTES) {
    formError.value = 'A imagem deve ter no máximo 5 MB.';
  } else {
    imageFile.value = file;
    setLocalPreview(file);
    return;
  }
  // Arquivo recusado: limpa o input para o mesmo arquivo poder ser
  // escolhido de novo depois.
  (event.target as HTMLInputElement).value = '';
}

// ---- Envio ----

const isSaving = ref(false);
const formError = ref('');

// Aceita "12,50", "1.234,50" e "12.50"; NaN para mais de 2 casas decimais
// ou texto inválido.
function parsePrice(value: string): number {
  const text = value.trim();
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
}

// Prévia dos pontos com as mesmas contas da API; null enquanto os campos
// não formam valores válidos.
const pointsPreview = computed(() => {
  const finalPrice = parsePrice(form.finalPrice);
  const conversionRate = parsePrice(form.conversionRate);
  if (!(finalPrice > 0) || !isValidRate(conversionRate)) return null;
  return calculatePoints(finalPrice, conversionRate);
});

const partialPreview = computed(() => {
  const cost = parsePrice(form.cost);
  if (pointsPreview.value === null || !(cost > 0)) return null;
  return calculatePartial(cost, pointsPreview.value);
});

function isValidRate(rate: number): boolean {
  return rate >= MIN_CONVERSION_RATE && rate <= MAX_CONVERSION_RATE;
}

function validate(): string | ProductInput {
  const name = form.name.trim();
  const description = form.description.trim();
  const category = form.category.trim();
  if (!name) return 'Informe o nome do produto.';
  if (!category) return 'Informe a categoria do produto.';
  if (!description) return 'Informe a descrição do produto.';
  if (!imagePreview.value) return 'Escolha uma imagem para o produto.';

  const finalPrice = parsePrice(form.finalPrice);
  if (!(finalPrice > 0)) {
    return 'Informe o preço final do produto (ex.: 49,90).';
  }
  const conversionRate = parsePrice(form.conversionRate);
  if (!isValidRate(conversionRate)) {
    return `A taxa de conversão deve ficar entre ${MIN_CONVERSION_RATE}% e ${MAX_CONVERSION_RATE}%.`;
  }
  if (!pointsPreview.value) {
    return 'O preço final é baixo demais para gerar pontos com essa taxa.';
  }

  let cost: number | null = null;
  if (form.allowsPartialPoints) {
    cost = parsePrice(form.cost);
    if (!(cost > 0)) {
      return 'Informe o preço de custo para a troca parcial (ex.: 20,00).';
    }
  }

  if (!form.allowedTiers.length) {
    return 'Escolha pelo menos um nível que pode trocar pelo produto.';
  }

  return {
    name,
    category,
    description,
    // Trocado pela URL do upload no envio, quando há imagem nova.
    imageUrl: props.product?.imageUrl ?? '',
    finalPrice,
    conversionRate,
    status: form.status,
    allowsPartialPoints: form.allowsPartialPoints,
    cost,
    // Na ordem dos níveis, independente da ordem em que foram marcados.
    allowedTiers: TIERS.map((tier) => tier.value).filter((tier) =>
      form.allowedTiers.includes(tier),
    ),
  };
}

async function handleSubmit() {
  formError.value = '';
  const input = validate();
  if (typeof input === 'string') {
    formError.value = input;
    return;
  }

  isSaving.value = true;
  try {
    if (imageFile.value) {
      input.imageUrl = await uploadProductImage(imageFile.value);
      // Já enviada: se salvar o produto falhar, a nova tentativa reaproveita
      // a URL em vez de subir o arquivo outra vez.
      imageFile.value = null;
      uploadedImageUrl.value = input.imageUrl;
    } else if (uploadedImageUrl.value) {
      input.imageUrl = uploadedImageUrl.value;
    }

    const saved = props.product
      ? await updateProduct(props.product.id, input)
      : await createProduct(input);
    emit('saved', saved);
  } catch (error) {
    formError.value = extractErrorMessage(
      error,
      'Não foi possível salvar o produto. Tente novamente.',
    );
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <form class="product-form" novalidate @submit.prevent="handleSubmit">
    <dl v-if="product" class="product-form__meta">
      <div>
        <dt>ID</dt>
        <dd>{{ product.id }}</dd>
      </div>
      <div>
        <dt>Cadastrado em</dt>
        <dd>{{ dateTimeFormat.format(new Date(product.createdAt)) }}</dd>
      </div>
    </dl>

    <div class="product-form__image">
      <div class="product-form__preview">
        <img
          v-if="imagePreview"
          :src="imagePreview"
          alt="Pré-visualização da imagem do produto"
        />
        <span v-else aria-hidden="true">Sem imagem</span>
      </div>
      <div class="product-form__image-actions">
        <span class="product-form__label">Imagem</span>
        <button
          type="button"
          class="product-form__button"
          @click="imageInputRef?.click()"
        >
          {{ imagePreview ? 'Trocar imagem' : 'Escolher imagem' }}
        </button>
        <input
          ref="imageInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="visually-hidden"
          aria-label="Imagem do produto"
          @change="handleImageChange"
        />
        <p class="product-form__hint">JPG, PNG ou WebP, até 5 MB.</p>
      </div>
    </div>

    <label class="product-form__field">
      <span class="product-form__label">Nome</span>
      <input
        v-model="form.name"
        type="text"
        maxlength="120"
        required
        placeholder="Ex.: Café coado 250 ml"
        class="product-form__input"
      />
    </label>

    <label class="product-form__field">
      <span class="product-form__label">Categoria</span>
      <input
        v-model="form.category"
        type="text"
        maxlength="60"
        required
        list="product-categories"
        placeholder="Ex.: Cafés"
        class="product-form__input"
      />
      <datalist id="product-categories">
        <option v-for="item in categories" :key="item" :value="item" />
      </datalist>
    </label>

    <label class="product-form__field">
      <span class="product-form__label">Descrição</span>
      <textarea
        v-model="form.description"
        maxlength="2000"
        rows="4"
        required
        class="product-form__input product-form__textarea"
      />
    </label>

    <div class="product-form__fields">
      <label class="product-form__field">
        <span class="product-form__label">Preço final (R$)</span>
        <input
          v-model="form.finalPrice"
          type="text"
          inputmode="decimal"
          required
          placeholder="0,00"
          class="product-form__input"
        />
      </label>
      <label class="product-form__field">
        <span class="product-form__label">Taxa de conversão (%)</span>
        <input
          v-model="form.conversionRate"
          type="text"
          inputmode="decimal"
          required
          :placeholder="`${MIN_CONVERSION_RATE} a ${MAX_CONVERSION_RATE}`"
          class="product-form__input"
        />
      </label>
    </div>

    <p class="product-form__hint" aria-live="polite">
      Troca integral:
      <strong v-if="pointsPreview">
        {{ integer.format(pointsPreview) }} pontos
      </strong>
      <template v-else>informe o preço final e a taxa</template>
    </p>

    <div class="product-form__fields">
      <fieldset class="product-form__field product-form__fieldset">
        <legend class="product-form__label">Status</legend>
        <div class="product-form__options">
          <label>
            <input v-model="form.status" type="radio" value="active" />
            Ativo
          </label>
          <label>
            <input v-model="form.status" type="radio" value="inactive" />
            Inativo
          </label>
        </div>
      </fieldset>
    </div>

    <label class="product-form__check">
      <input v-model="form.allowsPartialPoints" type="checkbox" />
      Permite troca parcial (pontos + preço)
    </label>

    <template v-if="form.allowsPartialPoints">
      <div class="product-form__fields">
        <label class="product-form__field">
          <span class="product-form__label">Preço de custo (R$)</span>
          <input
            v-model="form.cost"
            type="text"
            inputmode="decimal"
            required
            placeholder="0,00"
            class="product-form__input"
          />
        </label>
      </div>
      <p class="product-form__hint" aria-live="polite">
        Troca parcial (custo + 10% e 60% dos pontos):
        <strong v-if="partialPreview">
          {{ integer.format(partialPreview.partialPoints) }} pontos +
          {{ currency.format(partialPreview.partialPrice) }}
        </strong>
        <template v-else>informe o preço de custo</template>
      </p>
    </template>

    <fieldset class="product-form__field product-form__fieldset">
      <legend class="product-form__label">Níveis que podem trocar</legend>
      <div class="product-form__options">
        <label v-for="tier in TIERS" :key="tier.value">
          <input
            v-model="form.allowedTiers"
            type="checkbox"
            :value="tier.value"
          />
          {{ tier.label }}
        </label>
      </div>
    </fieldset>

    <p v-if="formError" class="product-form__error" role="alert">
      {{ formError }}
    </p>

    <button
      type="submit"
      class="product-form__button product-form__button--primary"
      :disabled="isSaving"
    >
      {{
        isSaving
          ? 'Salvando…'
          : product
            ? 'Salvar alterações'
            : 'Cadastrar produto'
      }}
    </button>
  </form>
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

.product-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;

  &__meta {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.75rem;

    div {
      padding: 0.7rem 0.9rem;
      border-radius: 0.8rem;
      background: var(--color-cream);
      min-width: 0;
    }

    dt {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-navy-muted);
    }

    dd {
      margin: 0.15rem 0 0;
      font-size: 0.85rem;
      color: var(--color-ink);
      overflow-wrap: anywhere;
      font-variant-numeric: tabular-nums;
    }
  }

  &__image {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }

  &__preview {
    width: 7.5rem;
    aspect-ratio: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 1rem;
    background: var(--color-cream);
    border: 1.5px dashed var(--color-navy-soft);
    font-size: 0.8rem;
    color: var(--color-navy-muted);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__image-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
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

  &__fieldset {
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }

  &__label {
    padding: 0;
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

  &__textarea {
    resize: vertical;
    min-height: 6rem;
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    padding: 0.7rem 0;
  }

  &__options label,
  &__check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.95rem;
    color: var(--color-ink);
    cursor: pointer;

    input {
      accent-color: var(--color-navy);
    }
  }

  &__check {
    font-weight: 600;
  }

  &__hint {
    margin: 0;
    font-size: 0.85rem;
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

  &__error {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-maroon);
  }
}
</style>
