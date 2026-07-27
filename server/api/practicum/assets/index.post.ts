import { createError, defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { saveAsset, type StoredAsset } from '../../../utils/practicum-repository'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain'])

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'UPLOAD_FORBIDDEN', data: { code: 'UPLOAD_FORBIDDEN' } })
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.filename)
  if (!file || !file.filename || !file.data) throw createError({ statusCode: 422, statusMessage: 'UPLOAD_REQUIRED', data: { code: 'UPLOAD_REQUIRED' } })
  if (!ALLOWED.has(file.type ?? '')) throw createError({ statusCode: 422, statusMessage: 'UPLOAD_TYPE_NOT_ALLOWED', data: { code: 'UPLOAD_TYPE_NOT_ALLOWED' } })
  if (file.data.byteLength > MAX_BYTES) throw createError({ statusCode: 422, statusMessage: 'UPLOAD_TOO_LARGE', data: { code: 'UPLOAD_TOO_LARGE' } })
  const id = `asset-${randomUUID()}`
  const storageKey = `${id}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const storageRoot = join(process.env.PRACTICUM_DATA_DIR || join(process.cwd(), '.data'), 'uploads')
  mkdirSync(storageRoot, { recursive: true })
  writeFileSync(join(storageRoot, storageKey), file.data)
  const asset: StoredAsset = { id, name: file.filename, sizeBytes: file.data.byteLength, mimeType: file.type ?? 'application/octet-stream', storageKey, ownerId: user.id, createdAt: new Date().toISOString() }
  saveAsset(user, asset)
  setResponseStatus(event, 201)
  return { asset: { id: asset.id, name: asset.name, sizeBytes: asset.sizeBytes, mimeType: asset.mimeType, createdAt: asset.createdAt } }
})
