import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

/**
 * Given a student belongs to a practicum room with an empty shop
 * When the student configures a freight template from the right drawer
 * Then the template appears in the data table and persists after reload
 */
test('[ORIGINAL-SANDBOX-001] student configures a persisted freight template', async ({ page }) => {
  await loginAsStudent(page)
  const templateName = `华东按件模板-${Date.now()}`

  await page.goto('/practicum/shop/products')
  await page.getByRole('tab', { name: '运费模板' }).click()
  await page.getByRole('button', { name: '新增运费模板' }).click()

  const drawer = page.locator('[data-freight-drawer]')
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('position', 'fixed')
  await drawer.getByLabel('模板名称').fill(templateName)
  await drawer.getByLabel('首件运费').fill('8')
  await drawer.getByLabel('续件运费').fill('2')
  await drawer.getByLabel('满额包邮').fill('99')
  await drawer.getByLabel('设为默认模板').check()
  await drawer.getByRole('button', { name: '保存运费模板' }).click()

  const row = page.getByRole('row', { name: new RegExp(templateName) })
  await expect(row).toContainText('按件计费')
  await expect(page.locator('[data-toast]')).toContainText('运费模板已保存')

  await page.reload()
  await page.getByRole('tab', { name: '运费模板' }).click()
  await expect(page.getByRole('row', { name: new RegExp(templateName) })).toBeVisible()

  await page.getByRole('row', { name: new RegExp(templateName) }).getByRole('button', { name: '删除' }).click()
  const confirm = page.locator('[data-confirm-modal]')
  await expect(confirm).toContainText(templateName)
  await confirm.getByRole('button', { name: '确认删除' }).click()
  await expect(page.getByRole('row', { name: new RegExp(templateName) })).toHaveCount(0)
  await expect(page.locator('[data-toast]')).toContainText('运费模板已删除')
})

/**
 * Given a student store has a freight template
 * When the student publishes a product with two SKUs from the right drawer
 * Then the product table shows its active status and persisted total stock
 */
test('[ORIGINAL-SANDBOX-001] student publishes and edits a multi-SKU product', async ({ page }) => {
  await loginAsStudent(page)
  const suffix = Date.now()
  const productName = `便携咖啡杯-${suffix}`
  const freightResponse = await page.request.post('/api/practicum/shop/freight-templates', {
    headers: await csrfHeaders(page),
    data: {
      roomId: 'room-001',
      name: `商品测试模板-${suffix}`,
      chargeType: 'PIECE',
      firstUnit: 1,
      firstFee: 6,
      additionalUnit: 1,
      additionalFee: 1,
      isDefault: false,
    },
  })
  expect(freightResponse.status()).toBe(201)
  const freightTemplate = (await freightResponse.json()).freightTemplate as { id: string }

  await page.goto('/practicum/shop/products')
  await page.getByRole('button', { name: '新增商品' }).click()
  const drawer = page.locator('[data-product-drawer]')
  await expect(drawer).toBeVisible()
  await drawer.getByLabel('商品名称').fill(productName)
  await drawer.getByLabel('商品分类').fill('咖啡器具')
  await drawer.getByLabel('商品描述').fill('用于模拟经营的双规格便携咖啡杯。')
  await drawer.getByLabel('基础价格').fill('59.90')
  await drawer.getByLabel('运费模板').selectOption(freightTemplate.id)
  await drawer.getByLabel('上架状态').selectOption('ACTIVE')

  const firstSku = drawer.locator('[data-sku-row]').nth(0)
  await firstSku.getByLabel('SKU 编码').fill(`CUP-WHITE-${suffix}`)
  await firstSku.getByLabel('规格名称').fill('白色 350ml')
  await firstSku.getByLabel('销售价格').fill('59.90')
  await firstSku.getByLabel('库存').fill('10')
  await drawer.getByRole('button', { name: '添加 SKU' }).click()
  const secondSku = drawer.locator('[data-sku-row]').nth(1)
  await secondSku.getByLabel('SKU 编码').fill(`CUP-BLACK-${suffix}`)
  await secondSku.getByLabel('规格名称').fill('黑色 500ml')
  await secondSku.getByLabel('销售价格').fill('69.90')
  await secondSku.getByLabel('库存').fill('15')
  await drawer.getByRole('button', { name: '保存商品' }).click()

  let row = page.getByRole('row', { name: new RegExp(productName) })
  await expect(row).toContainText('已上架')
  await expect(row).toContainText('2 个 SKU')
  await expect(row).toContainText('25')

  await row.getByRole('button', { name: '编辑' }).click()
  await expect(drawer).toBeVisible()
  await drawer.locator('[data-sku-row]').nth(0).getByLabel('库存').fill('30')
  await drawer.getByRole('button', { name: '保存商品' }).click()
  row = page.getByRole('row', { name: new RegExp(productName) })
  await expect(row).toContainText('45')

  await page.reload()
  row = page.getByRole('row', { name: new RegExp(productName) })
  await expect(row).toContainText('45')
  await row.getByRole('button', { name: '删除' }).click()
  await page.locator('[data-confirm-modal]').getByRole('button', { name: '确认删除' }).click()
  await expect(row).toHaveCount(0)

  const deletedFreight = await page.request.delete(`/api/practicum/shop/freight-templates/${freightTemplate.id}?roomId=room-001`, {
    headers: await csrfHeaders(page),
  })
  expect(deletedFreight.status()).toBe(200)
})

test('[ORIGINAL-SANDBOX-001] API rejects cross-room product access', async ({ page }) => {
  await loginAsStudent(page)
  const response = await page.request.get('/api/practicum/shop/products?roomId=room-002')
  expect(response.status()).toBe(403)
  expect(await response.json()).toEqual(expect.objectContaining({ statusMessage: 'SHOP_FORBIDDEN' }))
})

test('[ORIGINAL-SANDBOX-001] API rejects cross-room product and freight mutations without changing objects', async ({ page }) => {
  const suffix = Date.now()
  const freightName = `cross-room-freight-${suffix}`
  const productTitle = `cross-room-product-${suffix}`

  await loginAsOwner(page)
  const ownerHeaders = await csrfHeaders(page)
  const freightCreate = await page.request.post('/api/practicum/shop/freight-templates', {
    headers: ownerHeaders,
    data: {
      roomId: 'room-002',
      name: freightName,
      chargeType: 'PIECE',
      firstUnit: 1,
      firstFee: 8,
      additionalUnit: 1,
      additionalFee: 2,
      isDefault: false,
    },
  })
  expect(freightCreate.status()).toBe(201)
  const freightTemplate = (await freightCreate.json()).freightTemplate as { id: string; name: string; firstFee: string }

  const productCreate = await page.request.post('/api/practicum/shop/products', {
    headers: ownerHeaders,
    data: {
      roomId: 'room-002',
      title: productTitle,
      category: 'security-test',
      description: 'Target object for cross-room authorization verification.',
      basePrice: 19.9,
      status: 'ACTIVE',
      freightTemplateId: freightTemplate.id,
      skus: [{ skuCode: `SEC-${suffix}`, name: 'standard', price: 19.9, stock: 7 }],
    },
  })
  expect(productCreate.status()).toBe(201)
  const product = (await productCreate.json()).product as { id: string; title: string; skus: Array<{ stock: number }> }

  await loginAsStudent(page)
  const studentHeaders = await csrfHeaders(page)
  const productPatch = await page.request.patch(`/api/practicum/shop/products/${product.id}`, {
    headers: studentHeaders,
    data: {
      roomId: 'room-002',
      title: 'unauthorized product mutation',
      category: 'security-test',
      basePrice: 1,
      status: 'DRAFT',
      skus: [{ skuCode: `SEC-${suffix}`, name: 'standard', price: 1, stock: 0 }],
    },
  })
  expect(productPatch.status()).toBe(403)
  expect(await productPatch.json()).toEqual(expect.objectContaining({ statusMessage: 'SHOP_FORBIDDEN' }))

  const productDelete = await page.request.delete(`/api/practicum/shop/products/${product.id}?roomId=room-002`, { headers: studentHeaders })
  expect(productDelete.status()).toBe(403)
  expect(await productDelete.json()).toEqual(expect.objectContaining({ statusMessage: 'SHOP_FORBIDDEN' }))

  const freightPatch = await page.request.patch(`/api/practicum/shop/freight-templates/${freightTemplate.id}`, {
    headers: studentHeaders,
    data: {
      roomId: 'room-002',
      name: 'unauthorized freight mutation',
      chargeType: 'PIECE',
      firstUnit: 1,
      firstFee: 1,
      additionalUnit: 1,
      additionalFee: 1,
      isDefault: false,
    },
  })
  expect(freightPatch.status()).toBe(403)
  expect(await freightPatch.json()).toEqual(expect.objectContaining({ statusMessage: 'SHOP_FORBIDDEN' }))

  const freightDelete = await page.request.delete(`/api/practicum/shop/freight-templates/${freightTemplate.id}?roomId=room-002`, { headers: studentHeaders })
  expect(freightDelete.status()).toBe(403)
  expect(await freightDelete.json()).toEqual(expect.objectContaining({ statusMessage: 'SHOP_FORBIDDEN' }))

  await loginAsOwner(page)
  const products = await page.request.get('/api/practicum/shop/products?roomId=room-002')
  expect(products.status()).toBe(200)
  const persistedProduct = ((await products.json()).items as Array<{ id: string; title: string; skus: Array<{ stock: number }> }>).find(item => item.id === product.id)
  expect(persistedProduct).toEqual(expect.objectContaining({ title: productTitle, skus: [expect.objectContaining({ stock: 7 })] }))

  const freightTemplates = await page.request.get('/api/practicum/shop/freight-templates?roomId=room-002')
  expect(freightTemplates.status()).toBe(200)
  const persistedFreight = ((await freightTemplates.json()).items as Array<{ id: string; name: string; firstFee: string }>).find(item => item.id === freightTemplate.id)
  expect(persistedFreight).toEqual(expect.objectContaining({ name: freightName, firstFee: freightTemplate.firstFee }))

  const cleanupHeaders = await csrfHeaders(page)
  const productCleanup = await page.request.delete(`/api/practicum/shop/products/${product.id}?roomId=room-002`, { headers: cleanupHeaders })
  expect(productCleanup.status()).toBe(200)
  const freightCleanup = await page.request.delete(`/api/practicum/shop/freight-templates/${freightTemplate.id}?roomId=room-002`, { headers: cleanupHeaders })
  expect(freightCleanup.status()).toBe(200)
})
