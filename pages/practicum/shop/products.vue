<template>
  <ClientOnly>
    <PracticumShell context-title="模拟店铺" context-meta="商品与物流配置">
      <section data-shop-products class="shop-page">
        <header class="page-heading shop-heading">
          <div>
            <p class="eyebrow">模拟商家后台</p>
            <h1>商品与运费管理</h1>
            <p>统一维护商品规格、库存和配送计费规则。</p>
          </div>
          <button v-if="!loading && !error && !forbidden" type="button" class="primary-button" @click="activeTab === 'products' ? openProduct() : openFreight()">
            <PracticumIcon name="plus-square" />
            {{ activeTab === 'products' ? '新增商品' : '新增运费模板' }}
          </button>
        </header>

        <div class="shop-toolbar">
          <div class="shop-tabs" role="tablist" aria-label="店铺管理视图">
            <button type="button" role="tab" :aria-selected="activeTab === 'products'" :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">商品列表</button>
            <button type="button" role="tab" :aria-selected="activeTab === 'freight'" :class="{ active: activeTab === 'freight' }" @click="activeTab = 'freight'">运费模板</button>
          </div>
          <span v-if="storeName" class="shop-name">{{ storeName }}</span>
        </div>

        <div v-if="loading" data-shop-skeleton class="table-panel shop-skeleton" aria-label="正在加载店铺数据" aria-busy="true">
          <div v-for="row in 6" :key="row" class="skeleton-row"><span v-for="cell in 5" :key="cell" /></div>
        </div>
        <PracticumStatePanel v-else-if="forbidden" state="forbidden" title="无法访问该店铺" description="当前账号不属于这个实训室，请返回有权限的工作区。" />
        <PracticumStatePanel v-else-if="error" state="error" title="店铺数据加载失败" :description="error" @retry="load" />

        <template v-else-if="activeTab === 'products'">
          <PracticumStatePanel v-if="!products.length" state="empty" title="还没有商品" description="从新增商品开始，配置 SKU、库存和运费模板。" />
          <div v-else class="table-panel">
            <div class="table-wrap">
              <table class="data-table" aria-label="商品列表">
                <thead><tr><th>商品</th><th>状态</th><th>SKU</th><th>库存</th><th>价格</th><th>运费模板</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="product in products" :key="product.id">
                    <td><strong>{{ product.title }}</strong><small>{{ product.category }}</small></td>
                    <td><span :class="['status-pill', product.status === 'ACTIVE' ? '' : 'status-pill-orange']">{{ productStatusLabel(product.status) }}</span></td>
                    <td>{{ product.skuCount }} 个 SKU</td>
                    <td>{{ product.totalStock }}</td>
                    <td>¥{{ product.basePrice }}</td>
                    <td>{{ product.freightTemplate?.name ?? '未配置' }}</td>
                    <td>
                      <div class="table-actions">
                        <button type="button" class="icon-button" aria-label="编辑" title="编辑商品" @click="openProduct(product)"><PracticumIcon name="pencil" /></button>
                        <button type="button" class="icon-button danger-icon" aria-label="删除" title="删除商品" @click="requestDelete('product', product)"><PracticumIcon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <template v-else>
          <PracticumStatePanel v-if="!freightTemplates.length" state="empty" title="还没有运费模板" description="新增一个按件或按重量计费的配送规则。" />
          <div v-else class="table-panel">
            <div class="table-wrap">
              <table class="data-table" aria-label="运费模板列表">
                <thead><tr><th>模板名称</th><th>计费方式</th><th>首段费用</th><th>续段费用</th><th>满额包邮</th><th>关联商品</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="template in freightTemplates" :key="template.id">
                    <td><strong>{{ template.name }}</strong><small v-if="template.isDefault">默认模板</small></td>
                    <td>{{ freightTypeLabel(template.chargeType) }}</td>
                    <td>{{ template.firstUnit }} {{ unitLabel(template.chargeType) }} / ¥{{ template.firstFee }}</td>
                    <td>{{ template.additionalUnit }} {{ unitLabel(template.chargeType) }} / ¥{{ template.additionalFee }}</td>
                    <td>{{ template.freeShippingThreshold ? `¥${template.freeShippingThreshold}` : '不包邮' }}</td>
                    <td>{{ template._count.products }}</td>
                    <td>
                      <div class="table-actions">
                        <button type="button" class="icon-button" aria-label="编辑" title="编辑运费模板" @click="openFreight(template)"><PracticumIcon name="pencil" /></button>
                        <button type="button" class="icon-button danger-icon" aria-label="删除" title="删除运费模板" @click="requestDelete('freight', template)"><PracticumIcon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <div v-if="productDrawerOpen" class="shop-drawer-backdrop" @click.self="closeDrawers">
          <aside data-product-drawer class="shop-drawer" role="dialog" aria-modal="true" :aria-labelledby="'product-drawer-title'">
            <header class="drawer-header">
              <div><p class="eyebrow">商品档案</p><h2 id="product-drawer-title">{{ editingProductId ? '编辑商品' : '新增商品' }}</h2></div>
              <button type="button" class="icon-button" aria-label="关闭" title="关闭抽屉" @click="closeDrawers"><PracticumIcon name="x" /></button>
            </header>
            <form class="drawer-form" @submit.prevent="saveProduct">
              <label class="field">商品名称<input v-model="productForm.title" required maxlength="120"></label>
              <label class="field">商品分类<input v-model="productForm.category" required maxlength="80"></label>
              <label class="field field-wide">商品描述<textarea v-model="productForm.description" rows="3" maxlength="2000" /></label>
              <div class="form-grid">
                <label class="field">基础价格<input v-model="productForm.basePrice" required type="number" min="0.01" step="0.01"></label>
                <label class="field">上架状态<select v-model="productForm.status"><option value="DRAFT">保存草稿</option><option value="ACTIVE">立即上架</option><option value="INACTIVE">下架</option></select></label>
              </div>
              <label class="field">运费模板<select v-model="productForm.freightTemplateId" required><option value="" disabled>请选择运费模板</option><option v-for="template in freightTemplates" :key="template.id" :value="template.id">{{ template.name }}</option></select></label>

              <div class="sku-heading"><div><h3>SKU 规格</h3><p>至少保留一个销售规格。</p></div><button type="button" class="secondary-button compact-action" @click="addSku"><PracticumIcon name="plus-square" />添加 SKU</button></div>
              <fieldset v-for="(sku, index) in productForm.skus" :key="sku.key" data-sku-row class="sku-row">
                <legend>规格 {{ index + 1 }}</legend>
                <button v-if="productForm.skus.length > 1" type="button" class="icon-button sku-remove" aria-label="移除 SKU" title="移除 SKU" @click="removeSku(index)"><PracticumIcon name="trash" /></button>
                <div class="form-grid">
                  <label class="field">SKU 编码<input v-model="sku.skuCode" required maxlength="64"></label>
                  <label class="field">规格名称<input v-model="sku.name" required maxlength="100"></label>
                  <label class="field">销售价格<input v-model="sku.price" required type="number" min="0.01" step="0.01"></label>
                  <label class="field">库存<input v-model.number="sku.stock" required type="number" min="0" step="1"></label>
                </div>
              </fieldset>
              <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
              <footer class="drawer-actions"><button type="button" class="secondary-button" @click="closeDrawers">取消</button><button type="submit" class="primary-button" :disabled="saving">{{ saving ? '保存中…' : '保存商品' }}</button></footer>
            </form>
          </aside>
        </div>

        <div v-if="freightDrawerOpen" class="shop-drawer-backdrop" @click.self="closeDrawers">
          <aside data-freight-drawer class="shop-drawer freight-drawer" role="dialog" aria-modal="true" aria-labelledby="freight-drawer-title">
            <header class="drawer-header">
              <div><p class="eyebrow">配送计费</p><h2 id="freight-drawer-title">{{ editingFreightId ? '编辑运费模板' : '新增运费模板' }}</h2></div>
              <button type="button" class="icon-button" aria-label="关闭" title="关闭抽屉" @click="closeDrawers"><PracticumIcon name="x" /></button>
            </header>
            <form class="drawer-form" @submit.prevent="saveFreight">
              <label class="field">模板名称<input v-model="freightForm.name" required maxlength="100"></label>
              <label class="field">计费方式<select v-model="freightForm.chargeType"><option value="PIECE">按件计费</option><option value="WEIGHT">按重量计费</option></select></label>
              <div class="form-grid">
                <label class="field">首件数量<input v-model="freightForm.firstUnit" required type="number" min="0.01" step="0.01"></label>
                <label class="field">首件运费<input v-model="freightForm.firstFee" required type="number" min="0" step="0.01"></label>
                <label class="field">续件数量<input v-model="freightForm.additionalUnit" required type="number" min="0.01" step="0.01"></label>
                <label class="field">续件运费<input v-model="freightForm.additionalFee" required type="number" min="0" step="0.01"></label>
              </div>
              <label class="field">满额包邮<input v-model="freightForm.freeShippingThreshold" type="number" min="0.01" step="0.01" placeholder="不填写则不启用"></label>
              <label class="check-field"><input v-model="freightForm.isDefault" type="checkbox">设为默认模板</label>
              <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
              <footer class="drawer-actions"><button type="button" class="secondary-button" @click="closeDrawers">取消</button><button type="submit" class="primary-button" :disabled="saving">{{ saving ? '保存中…' : '保存运费模板' }}</button></footer>
            </form>
          </aside>
        </div>

        <div v-if="deleteTarget" class="modal-backdrop">
          <section data-confirm-modal class="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title">确认删除</h2>
            <p>将删除“{{ deleteTarget.name }}”。此操作无法撤销。</p>
            <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            <div class="form-actions"><button type="button" class="secondary-button" @click="deleteTarget = null">取消</button><button type="button" class="danger-button" :disabled="saving" @click="confirmDelete">{{ saving ? '删除中…' : '确认删除' }}</button></div>
          </section>
        </div>

        <p v-if="toast" data-toast class="shop-toast" role="status">{{ toast }}</p>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'
type ChargeType = 'PIECE' | 'WEIGHT'

interface ProductSku { id?: string; skuCode: string; name: string; price: string; stock: number }
interface Product {
  id: string; title: string; category: string; description: string; basePrice: string; status: ProductStatus
  freightTemplateId: string | null; freightTemplate: { id: string; name: string } | null
  skus: ProductSku[]; skuCount: number; totalStock: number
}
interface FreightTemplate {
  id: string; name: string; chargeType: ChargeType; firstUnit: string; firstFee: string
  additionalUnit: string; additionalFee: string; freeShippingThreshold: string | null; isDefault: boolean
  _count: { products: number }
}

const workspace = useWorkspaceContext()
const activeTab = ref<'products' | 'freight'>('products')
const products = ref<Product[]>([])
const freightTemplates = ref<FreightTemplate[]>([])
const storeName = ref('')
const roomId = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const forbidden = ref(false)
const formError = ref('')
const toast = ref('')
const productDrawerOpen = ref(false)
const freightDrawerOpen = ref(false)
const editingProductId = ref('')
const editingFreightId = ref('')
const deleteTarget = ref<{ type: 'product' | 'freight'; id: string; name: string } | null>(null)
let skuSequence = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

const productForm = reactive({
  title: '', category: '', description: '', basePrice: '', status: 'DRAFT' as ProductStatus, freightTemplateId: '',
  skus: [] as Array<ProductSku & { key: number }>,
})
const freightForm = reactive({
  name: '', chargeType: 'PIECE' as ChargeType, firstUnit: '1', firstFee: '', additionalUnit: '1', additionalFee: '', freeShippingThreshold: '', isDefault: false,
})

function apiStatus(cause: unknown) {
  if (!cause || typeof cause !== 'object') return 0
  const error = cause as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }
  return Number(error.statusCode ?? error.status ?? error.response?.status ?? 0)
}

function showToast(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3200)
}

async function load() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    await workspace.load()
    roomId.value = workspace.state.value.room?.id ?? ''
    if (!roomId.value) throw new Error('当前实训室上下文不可用。')
    const [productResponse, freightResponse] = await Promise.all([
      $fetch<{ store: { name: string } | null; items: Product[] }>(`/api/practicum/shop/products?roomId=${encodeURIComponent(roomId.value)}`),
      $fetch<{ store: { name: string } | null; items: FreightTemplate[] }>(`/api/practicum/shop/freight-templates?roomId=${encodeURIComponent(roomId.value)}`),
    ])
    products.value = productResponse.items
    freightTemplates.value = freightResponse.items
    storeName.value = productResponse.store?.name ?? freightResponse.store?.name ?? ''
  } catch (cause) {
    if (apiStatus(cause) === 403) forbidden.value = true
    else error.value = '无法连接店铺数据库。请检查服务后重试；业务数据没有使用本地示例回退。'
  } finally {
    loading.value = false
  }
}

function newSku(sku?: ProductSku) {
  return { key: ++skuSequence, skuCode: sku?.skuCode ?? '', name: sku?.name ?? '', price: sku?.price ?? '', stock: sku?.stock ?? 0 }
}

function addSku() { productForm.skus.push(newSku()) }
function removeSku(index: number) { productForm.skus.splice(index, 1) }

function openProduct(product?: Product) {
  formError.value = ''
  editingProductId.value = product?.id ?? ''
  Object.assign(productForm, {
    title: product?.title ?? '', category: product?.category ?? '', description: product?.description ?? '', basePrice: product?.basePrice ?? '',
    status: product?.status ?? 'DRAFT', freightTemplateId: product?.freightTemplateId ?? freightTemplates.value.find(item => item.isDefault)?.id ?? '',
    skus: (product?.skus.length ? product.skus : [{} as ProductSku]).map(newSku),
  })
  productDrawerOpen.value = true
}

function openFreight(template?: FreightTemplate) {
  formError.value = ''
  editingFreightId.value = template?.id ?? ''
  Object.assign(freightForm, {
    name: template?.name ?? '', chargeType: template?.chargeType ?? 'PIECE', firstUnit: template?.firstUnit ?? '1', firstFee: template?.firstFee ?? '',
    additionalUnit: template?.additionalUnit ?? '1', additionalFee: template?.additionalFee ?? '', freeShippingThreshold: template?.freeShippingThreshold ?? '', isDefault: template?.isDefault ?? false,
  })
  freightDrawerOpen.value = true
}

function closeDrawers() {
  productDrawerOpen.value = false
  freightDrawerOpen.value = false
  formError.value = ''
}

async function saveProduct() {
  saving.value = true
  formError.value = ''
  try {
    const path = editingProductId.value ? `/api/practicum/shop/products/${editingProductId.value}` : '/api/practicum/shop/products'
    await $fetch(path, {
      method: editingProductId.value ? 'PATCH' : 'POST', headers: useCsrfHeaders(),
      body: { roomId: roomId.value, ...productForm, skus: productForm.skus.map(({ key: _key, ...sku }) => sku) },
    })
    closeDrawers()
    await load()
    showToast('商品已保存')
  } catch {
    formError.value = '商品保存失败，请检查必填项、SKU 编码和运费模板。'
  } finally { saving.value = false }
}

async function saveFreight() {
  saving.value = true
  formError.value = ''
  try {
    const path = editingFreightId.value ? `/api/practicum/shop/freight-templates/${editingFreightId.value}` : '/api/practicum/shop/freight-templates'
    await $fetch(path, { method: editingFreightId.value ? 'PATCH' : 'POST', headers: useCsrfHeaders(), body: { roomId: roomId.value, ...freightForm } })
    closeDrawers()
    await load()
    showToast('运费模板已保存')
  } catch {
    formError.value = '运费模板保存失败，请检查名称和计费金额是否有效。'
  } finally { saving.value = false }
}

function requestDelete(type: 'product' | 'freight', item: Product | FreightTemplate) {
  formError.value = ''
  deleteTarget.value = { type, id: item.id, name: 'title' in item ? item.title : item.name }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  formError.value = ''
  try {
    const target = deleteTarget.value
    const segment = target.type === 'product' ? 'products' : 'freight-templates'
    await $fetch(`/api/practicum/shop/${segment}/${target.id}?roomId=${encodeURIComponent(roomId.value)}`, { method: 'DELETE', headers: useCsrfHeaders() })
    deleteTarget.value = null
    await load()
    showToast(target.type === 'product' ? '商品已删除' : '运费模板已删除')
  } catch (cause) {
    formError.value = apiStatus(cause) === 409 ? '该运费模板仍被商品使用，不能删除。' : '删除失败，请重试。'
  } finally { saving.value = false }
}

function productStatusLabel(status: ProductStatus) { return ({ DRAFT: '草稿', ACTIVE: '已上架', INACTIVE: '已下架' })[status] }
function freightTypeLabel(type: ChargeType) { return type === 'PIECE' ? '按件计费' : '按重量计费' }
function unitLabel(type: ChargeType) { return type === 'PIECE' ? '件' : 'kg' }

onMounted(load)
</script>

<style scoped>
.shop-page { width:min(1320px, 100%); margin:0 auto; }
.shop-heading { align-items:center; }
.shop-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:14px; }
.shop-tabs { display:inline-flex; padding:3px; background:#e9eef5; border-radius:6px; }
.shop-tabs button { min-height:38px; padding:7px 16px; color:var(--practicum-muted); background:transparent; border:0; border-radius:4px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.shop-tabs button.active { color:var(--practicum-accent); background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.08); }
.shop-name { color:var(--practicum-muted); font-size:13px; }
td strong, td small { display:block; }
td small { margin-top:3px; color:var(--practicum-muted); font-size:11px; }
.table-actions { display:flex; gap:6px; }
.danger-icon { color:var(--practicum-danger); }
.shop-skeleton { padding:10px 16px; }
.skeleton-row { display:grid; grid-template-columns:2fr repeat(4, 1fr); gap:20px; padding:15px 0; border-bottom:1px solid var(--practicum-border); }
.skeleton-row span { height:15px; background:linear-gradient(90deg,#edf0f3 25%,#f7f8fa 50%,#edf0f3 75%); background-size:200% 100%; border-radius:3px; animation:skeleton 1.2s linear infinite; }
@keyframes skeleton { to { background-position:-200% 0; } }
.shop-drawer-backdrop, .modal-backdrop { position:fixed; inset:0; z-index:100; background:rgba(17,24,39,.28); }
.shop-drawer { position:fixed; top:0; right:0; z-index:101; width:min(620px, 100vw); height:100vh; overflow-y:auto; color:var(--practicum-ink); background:#fff; border-left:1px solid var(--practicum-border); box-shadow:-12px 0 30px rgba(16,24,40,.12); animation:drawer-in .2s ease-out; }
.freight-drawer { width:min(520px, 100vw); }
@keyframes drawer-in { from { transform:translateX(100%); } to { transform:translateX(0); } }
.drawer-header { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 22px; background:#fff; border-bottom:1px solid var(--practicum-border); }
.drawer-header h2 { margin:0; font-size:20px; }
.drawer-form { display:grid; gap:16px; padding:22px; }
.field-wide { grid-column:1 / -1; }
.check-field { display:flex; align-items:center; gap:9px; min-height:44px; font-size:13px; font-weight:700; }
.check-field input { width:18px; height:18px; }
.sku-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-top:6px; border-top:1px solid var(--practicum-border); }
.sku-heading h3 { margin:0; font-size:16px; }
.sku-heading p { margin:3px 0 0; color:var(--practicum-muted); font-size:12px; }
.sku-row { position:relative; margin:0; padding:16px; border:1px solid var(--practicum-border); border-radius:6px; }
.sku-row legend { padding:0 5px; font-size:12px; font-weight:800; }
.sku-remove { position:absolute; top:8px; right:8px; color:var(--practicum-danger); }
.drawer-actions { position:sticky; bottom:0; display:flex; justify-content:flex-end; gap:10px; margin:0 -22px -22px; padding:14px 22px; background:#fff; border-top:1px solid var(--practicum-border); }
.confirm-modal { position:absolute; top:50%; left:50%; width:min(420px, calc(100vw - 32px)); padding:22px; background:#fff; border-radius:6px; transform:translate(-50%,-50%); }
.confirm-modal h2 { margin:0; font-size:18px; }
.confirm-modal p { margin:10px 0 0; color:var(--practicum-muted); font-size:13px; line-height:1.6; }
.confirm-modal .form-actions { justify-content:flex-end; }
.shop-toast { position:fixed; right:24px; bottom:24px; z-index:120; max-width:min(360px, calc(100vw - 32px)); margin:0; padding:12px 16px; color:#fff; background:#101828; border-radius:6px; box-shadow:0 10px 24px rgba(16,24,40,.18); font-size:13px; font-weight:700; }
.form-error { margin:0; color:var(--practicum-danger); font-size:13px; }
@media (max-width:640px) {
  .shop-heading, .shop-toolbar, .sku-heading { align-items:stretch; display:grid; }
  .shop-heading .primary-button { width:100%; }
  .shop-tabs { display:grid; grid-template-columns:1fr 1fr; }
  .shop-name { display:none; }
  .drawer-form, .drawer-header { padding:16px; }
  .drawer-actions { margin:0 -16px -16px; padding:12px 16px; }
}
@media (prefers-reduced-motion:reduce) { .shop-drawer, .skeleton-row span { animation:none; } }
</style>
