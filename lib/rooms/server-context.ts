import { headers } from 'next/headers'
import {
  extractRoomContextFromHeaders,
  type RoomContext,
} from '@/lib/rooms/context'

export async function getRequestRoomContext(): Promise<RoomContext | null> {
  const headerBag = await headers()
  return extractRoomContextFromHeaders(headerBag)
}
