import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateIPAccess, validateIPAccessByRoomId } from '@/lib/ip-validation'
import type { Database } from '@/types'
import type { IPValidationResult } from '@/lib/ip-validation'

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const ROOM_ID_HEADER = 'x-room-id'
export const ROOM_SLUG_HEADER = 'x-room-slug'

export interface RoomContext {
  id: string
  code: string | null
}

export interface RoomContextResult {
  context: RoomContext | null
  validation: IPValidationResult | null
}

export interface RoomResolver {
  resolve: (identifier: string | null | undefined) => Promise<RoomContext | null>
  resolveById: (roomId: string | null | undefined) => Promise<RoomContext | null>
  buildRoomPath: (roomId: string | null | undefined, suffix?: string) => Promise<string>
  validateAdminAccess: (
    request: NextRequest,
    identifier: string | null | undefined
  ) => Promise<RoomContextResult>
}

function normalizeSuffix(suffix: string): string {
  if (!suffix) {
    return ''
  }

  return suffix.startsWith('/') ? suffix : `/${suffix}`
}

export function extractRoomContextFromHeaders(
  headers: Pick<Headers, 'get'>
): RoomContext | null {
  const id = headers.get(ROOM_ID_HEADER)
  const code = headers.get(ROOM_SLUG_HEADER)

  if (!id && !code) {
    return null
  }

  return {
    id: id ?? '',
    code,
  }
}

export function createRoomResolver(
  supabase: SupabaseClient<Database>
): RoomResolver {
  const cache = new Map<string, RoomContext | null>()

  const storeInCache = (identifier: string, context: RoomContext | null): void => {
    cache.set(identifier, context)

    if (context) {
      cache.set(context.id, context)

      if (context.code) {
        cache.set(context.code, context)
      }
    }
  }

  const resolve = async (
    identifier: string | null | undefined
  ): Promise<RoomContext | null> => {
    if (!identifier) {
      return null
    }

    const cached = cache.get(identifier)
    if (cached !== undefined) {
      return cached
    }

    try {
      const isUUID = UUID_REGEX.test(identifier)

      const { data } = await supabase
        .from('rooms')
        .select('id, code')
        .eq(isUUID ? 'id' : 'code', identifier)
        .eq('is_active', true)
        .maybeSingle()

      const context = data ? { id: data.id, code: data.code } : null
      storeInCache(identifier, context)

      return context
    } catch (error) {
      console.error('Failed to resolve room context', error)
      storeInCache(identifier, null)
      return null
    }
  }

  const resolveById = async (
    roomId: string | null | undefined
  ): Promise<RoomContext | null> => {
    if (!roomId) {
      return null
    }

    return resolve(roomId)
  }

  const buildRoomPath = async (
    roomId: string | null | undefined,
    suffix = ''
  ): Promise<string> => {
    const normalisedSuffix = normalizeSuffix(suffix)

    if (!roomId) {
      return '/rooms'
    }

    const context = await resolveById(roomId)
    const segment = context?.code ?? roomId

    return `/rooms/${segment}${normalisedSuffix}`
  }

  const validateAdminAccess = async (
    request: NextRequest,
    identifier: string | null | undefined
  ): Promise<RoomContextResult> => {
    const context = await resolve(identifier)

    if (!context) {
      return {
        context: null,
        validation: null,
      }
    }

    if (context.code) {
      const validation = await validateIPAccess(request, context.code, supabase)

      if (
        !validation.isAllowed &&
        validation.reason === 'Room not found' &&
        context.id
      ) {
        const fallback = await validateIPAccessByRoomId(
          request,
          context.id,
          supabase
        )

        return {
          context,
          validation: fallback,
        }
      }

      return {
        context,
        validation,
      }
    }

    const validation = await validateIPAccessByRoomId(
      request,
      context.id,
      supabase
    )

    return {
      context,
      validation,
    }
  }

  return {
    resolve,
    resolveById,
    buildRoomPath,
    validateAdminAccess,
  }
}
