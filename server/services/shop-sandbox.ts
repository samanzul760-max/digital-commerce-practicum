import { createError } from 'h3'
import { Prisma, type FreightChargeType, type ProductStatus } from '@prisma/client'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

export interface ProductSkuInput {
  skuCode?: string
  name?: string
  price?: number | string
  stock?: number | string
  attributes?: Record<string, string>
}

export interface ProductInput {
  roomId?: string
  title?: string
  category?: string
  description?: string
  basePrice?: number | string
  status?: ProductStatus
  freightTemplateId?: string | null
  skus?: ProductSkuInput[]
}

export interface FreightTemplateInput {
  roomId?: string
  name?: string
  chargeType?: FreightChargeType
  firstUnit?: number | string
  firstFee?: number | string
  additionalUnit?: number | string
  additionalFee?: number | string
  freeShippingThreshold?: number | string | null
  isDefault?: boolean
}

function shopError(statusCode: number, statusMessage: string) {
  return createError({ statusCode, statusMessage, data: { code: statusMessage } })
}

function requiredText(value: unknown, field: string, maxLength = 120) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > maxLength) throw shopError(422, `SHOP_${field}_INVALID`)
  return text
}

function optionalText(value: unknown, field: string, maxLength: number) {
  if (value == null) return ''
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length > maxLength) throw shopError(422, `SHOP_${field}_INVALID`)
  return text
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requestBody<T>(value: T, field: string) {
  if (!isRecord(value)) throw shopError(422, `SHOP_${field}_INVALID`)
  return value
}

function decimal(value: unknown, field: string, allowZero = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw shopError(422, `SHOP_${field}_INVALID`)
  }
  const number = Number(value)
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw shopError(422, `SHOP_${field}_INVALID`)
  }
  return new Prisma.Decimal(number)
}

function stock(value: unknown) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw shopError(422, 'SHOP_SKU_STOCK_INVALID')
  }
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount < 0) throw shopError(422, 'SHOP_SKU_STOCK_INVALID')
  return amount
}

function optionalId(value: unknown, field: string) {
  if (value == null || value === '') return null
  return requiredText(value, field, 80)
}

function attributes(value: unknown) {
  if (value == null) return {}
  if (!isRecord(value) || Object.keys(value).length > 20 || Object.entries(value).some(([key, item]) => !key.trim() || key.length > 64 || typeof item !== 'string' || item.length > 200)) {
    throw shopError(422, 'SHOP_SKU_ATTRIBUTES_INVALID')
  }
  return value as Record<string, string>
}

function strictBoolean(value: unknown, field: string) {
  if (value == null) return false
  if (typeof value !== 'boolean') throw shopError(422, `SHOP_${field}_INVALID`)
  return value
}

async function databaseAction<T>(operation: () => Promise<T>, uniqueConflict: string = 'SHOP_CONFLICT') {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw shopError(409, uniqueConflict)
      if (error.code === 'P2003') throw shopError(409, 'FREIGHT_TEMPLATE_IN_USE')
      if (error.code === 'P2025') throw shopError(404, 'SHOP_NOT_FOUND')
    }
    throw error
  }
}

function roomIdFrom(value: unknown) {
  return requiredText(value, 'ROOM', 80)
}

export async function requireShopRoom(user: AuthUser, requestedRoomId: unknown) {
  const roomId = roomIdFrom(requestedRoomId)
  if (!['OWNER', 'STUDENT'].includes(user.role) || !user.roomIds.includes(roomId)) {
    throw shopError(403, 'SHOP_FORBIDDEN')
  }
  const room = await prisma.trainingRoom.findUnique({ where: { id: roomId }, select: { id: true } })
  if (!room) throw shopError(404, 'SHOP_ROOM_NOT_FOUND')
  return roomId
}

async function ownedStore(user: AuthUser, roomId: string) {
  return await prisma.store.findUnique({ where: { roomId_ownerId: { roomId, ownerId: user.id } } })
}

async function requireOwnedProduct(user: AuthUser, roomId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, store: { roomId, ownerId: user.id } },
    include: { store: true, skus: true },
  })
  if (!product) throw shopError(404, 'PRODUCT_NOT_FOUND')
  return product
}

async function requireOwnedFreightTemplate(user: AuthUser, roomId: string, freightTemplateId: string) {
  const freightTemplate = await prisma.freightTemplate.findFirst({
    where: { id: freightTemplateId, store: { roomId, ownerId: user.id } },
  })
  if (!freightTemplate) throw shopError(404, 'FREIGHT_TEMPLATE_NOT_FOUND')
  return freightTemplate
}

function productData(input: ProductInput) {
  const title = requiredText(input.title, 'PRODUCT_TITLE')
  const category = requiredText(input.category, 'PRODUCT_CATEGORY', 80)
  const description = optionalText(input.description, 'PRODUCT_DESCRIPTION', 2000)
  const basePrice = decimal(input.basePrice, 'PRODUCT_PRICE')
  const status = input.status ?? 'DRAFT'
  if (!['DRAFT', 'ACTIVE', 'INACTIVE'].includes(status)) throw shopError(422, 'SHOP_PRODUCT_STATUS_INVALID')
  const rawSkus = Array.isArray(input.skus) ? input.skus : []
  if (!rawSkus.length || rawSkus.length > 50) throw shopError(422, 'SHOP_PRODUCT_SKUS_INVALID')
  const skus = rawSkus.map((sku) => {
    const record = requestBody(sku, 'SKU') as ProductSkuInput
    return {
      skuCode: requiredText(record.skuCode, 'SKU_CODE', 64),
      name: requiredText(record.name, 'SKU_NAME', 100),
      price: decimal(record.price, 'SKU_PRICE'),
      stock: stock(record.stock),
      attributes: attributes(record.attributes),
    }
  })
  if (new Set(skus.map(sku => sku.skuCode)).size !== skus.length) throw shopError(422, 'SHOP_SKU_CODE_DUPLICATE')
  const freightTemplateId = optionalId(input.freightTemplateId, 'PRODUCT_FREIGHT')
  if (status === 'ACTIVE' && !freightTemplateId) throw shopError(422, 'SHOP_PRODUCT_FREIGHT_REQUIRED')
  return { title, category, description, basePrice, status, skus, freightTemplateId }
}

function freightData(input: FreightTemplateInput) {
  const name = requiredText(input.name, 'FREIGHT_NAME', 100)
  const chargeType = input.chargeType ?? 'PIECE'
  if (!['PIECE', 'WEIGHT'].includes(chargeType)) throw shopError(422, 'SHOP_FREIGHT_TYPE_INVALID')
  return {
    name,
    chargeType,
    firstUnit: decimal(input.firstUnit ?? 1, 'FREIGHT_FIRST_UNIT'),
    firstFee: decimal(input.firstFee, 'FREIGHT_FIRST_FEE', true),
    additionalUnit: decimal(input.additionalUnit ?? 1, 'FREIGHT_ADDITIONAL_UNIT'),
    additionalFee: decimal(input.additionalFee, 'FREIGHT_ADDITIONAL_FEE', true),
    freeShippingThreshold: input.freeShippingThreshold === '' || input.freeShippingThreshold == null
      ? null
      : decimal(input.freeShippingThreshold, 'FREIGHT_FREE_THRESHOLD'),
    isDefault: strictBoolean(input.isDefault, 'FREIGHT_DEFAULT'),
  }
}

function presentProduct<T extends { skus: Array<{ stock: number }> }>(product: T) {
  return { ...product, skuCount: product.skus.length, totalStock: product.skus.reduce((sum, sku) => sum + sku.stock, 0) }
}

export async function listProducts(user: AuthUser, requestedRoomId: unknown) {
  const roomId = await requireShopRoom(user, requestedRoomId)
  const store = await ownedStore(user, roomId)
  if (!store) return { store: null, items: [] }
  const items = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { skus: { orderBy: { createdAt: 'asc' } }, freightTemplate: true },
    orderBy: { updatedAt: 'desc' },
  })
  return { store, items: items.map(presentProduct) }
}

export async function createProduct(user: AuthUser, input: ProductInput) {
  const body = requestBody(input, 'PRODUCT') as ProductInput
  const roomId = await requireShopRoom(user, body.roomId)
  const data = productData(body)
  const product = await databaseAction(() => prisma.$transaction(async transaction => {
    const store = await transaction.store.upsert({
      where: { roomId_ownerId: { roomId, ownerId: user.id } },
      update: {},
      create: { roomId, ownerId: user.id, name: `${user.displayName}的模拟店铺` },
    })
    if (data.freightTemplateId) {
      const count = await transaction.freightTemplate.count({ where: { id: data.freightTemplateId, storeId: store.id } })
      if (!count) throw shopError(422, 'SHOP_PRODUCT_FREIGHT_INVALID')
    }
    return await transaction.product.create({
      data: {
        storeId: store.id,
        freightTemplateId: data.freightTemplateId,
        title: data.title,
        category: data.category,
        description: data.description,
        basePrice: data.basePrice,
        status: data.status,
        skus: { create: data.skus },
      },
      include: { skus: true, freightTemplate: true },
    })
  }))
  return presentProduct(product)
}

export async function updateProduct(user: AuthUser, productId: string, input: ProductInput) {
  const body = requestBody(input, 'PRODUCT') as ProductInput
  const roomId = await requireShopRoom(user, body.roomId)
  const current = await requireOwnedProduct(user, roomId, productId)
  const data = productData(body)
  if (data.freightTemplateId) await requireOwnedFreightTemplate(user, roomId, data.freightTemplateId)
  const product = await databaseAction(() => prisma.product.update({
    where: { id: current.id },
    data: {
      freightTemplateId: data.freightTemplateId,
      title: data.title,
      category: data.category,
      description: data.description,
      basePrice: data.basePrice,
      status: data.status,
      skus: { deleteMany: {}, create: data.skus },
    },
    include: { skus: true, freightTemplate: true },
  }))
  return presentProduct(product)
}

export async function deleteProduct(user: AuthUser, requestedRoomId: unknown, productId: string) {
  const roomId = await requireShopRoom(user, requestedRoomId)
  const product = await requireOwnedProduct(user, roomId, productId)
  await databaseAction(() => prisma.product.delete({ where: { id: product.id } }))
}

export async function listFreightTemplates(user: AuthUser, requestedRoomId: unknown) {
  const roomId = await requireShopRoom(user, requestedRoomId)
  const store = await ownedStore(user, roomId)
  if (!store) return { store: null, items: [] }
  const items = await prisma.freightTemplate.findMany({
    where: { storeId: store.id },
    include: { _count: { select: { products: true } } },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
  return { store, items }
}

export async function createFreightTemplate(user: AuthUser, input: FreightTemplateInput) {
  const body = requestBody(input, 'FREIGHT') as FreightTemplateInput
  const roomId = await requireShopRoom(user, body.roomId)
  const data = freightData(body)
  return await databaseAction(() => prisma.$transaction(async transaction => {
    const store = await transaction.store.upsert({
      where: { roomId_ownerId: { roomId, ownerId: user.id } },
      update: {},
      create: { roomId, ownerId: user.id, name: `${user.displayName}的模拟店铺` },
    })
    if (data.isDefault) await transaction.freightTemplate.updateMany({ where: { storeId: store.id }, data: { isDefault: false } })
    return await transaction.freightTemplate.create({ data: { ...data, storeId: store.id } })
  }), 'SHOP_FREIGHT_NAME_EXISTS')
}

export async function updateFreightTemplate(user: AuthUser, freightTemplateId: string, input: FreightTemplateInput) {
  const body = requestBody(input, 'FREIGHT') as FreightTemplateInput
  const roomId = await requireShopRoom(user, body.roomId)
  const current = await requireOwnedFreightTemplate(user, roomId, freightTemplateId)
  const data = freightData(body)
  return await databaseAction(() => prisma.$transaction(async transaction => {
    if (data.isDefault) await transaction.freightTemplate.updateMany({ where: { storeId: current.storeId, id: { not: current.id } }, data: { isDefault: false } })
    return await transaction.freightTemplate.update({ where: { id: current.id }, data })
  }), 'SHOP_FREIGHT_NAME_EXISTS')
}

export async function deleteFreightTemplate(user: AuthUser, requestedRoomId: unknown, freightTemplateId: string) {
  const roomId = await requireShopRoom(user, requestedRoomId)
  const freightTemplate = await requireOwnedFreightTemplate(user, roomId, freightTemplateId)
  const productCount = await prisma.product.count({ where: { freightTemplateId: freightTemplate.id } })
  if (productCount) throw shopError(409, 'FREIGHT_TEMPLATE_IN_USE')
  await databaseAction(() => prisma.freightTemplate.delete({ where: { id: freightTemplate.id } }))
}
