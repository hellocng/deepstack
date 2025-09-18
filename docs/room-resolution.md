# Room Resolution & Slug Canonicalization

This document explains how DeepStack resolves room identifiers (slugs vs UUIDs), how the middleware enforces canonical URLs, and how downstream code consumes the resolved context without duplicating lookups.

## Overview

Room URLs are served under `/rooms/[room]`. The `[room]` segment can be either the human-friendly slug (`rooms.code`) or the raw room UUID (`rooms.id`). The middleware is responsible for normalising the request, validating access, and forwarding context so that pages, layouts, and API routes can rely on a single resolution pass.

Key goals:

- Allow operators to access admin routes using either slug or UUID while keeping the public URLs stable.
- Avoid redundant `rooms` lookups across server components and API handlers.
- Ensure IP restrictions and access checks always operate on the canonical room ID.

## Middleware Flow

The middleware coordinates the resolution process:

1. `createRoomResolver(supabase)` instantiates a per-request helper that caches `rooms` lookups.
2. `extractRoomFromPath(pathname)` grabs the `[room]` segment from URLs beginning with `/rooms/`.
3. `roomResolver.resolve(roomParam)` fetches the active room, accepting either slug or UUID. Results are cached under both `id` and `code`.
4. If the request used a UUID and the room has a slug, the middleware issues a redirect to the slugged URL, keeping paths clean.
5. The resolved `id` and `code` are forwarded via request headers:
   - `x-room-id` – always set when a room is resolved.
   - `x-room-slug` – only present when the room has a slug.
6. For admin routes, `roomResolver.validateAdminAccess(req, roomParam)` applies IP restrictions, falling back to room ID when the slug is missing.
7. Operator metadata (`x-operator-id`, `x-operator-role`, `x-operator-room-id`) is also forwarded when the user is an operator.

## Resolver Utility

`lib/rooms/context.ts` exposes the shared resolver used by the middleware and other entry points:

- `resolve(identifier)` – resolve by slug or UUID.
- `resolveById(roomId)` – convenience wrapper keyed by UUID.
- `buildRoomPath(roomId, suffix)` – compose `/rooms/[slug]/suffix`, falling back to the UUID if no slug exists.
- `validateAdminAccess(request, identifier)` – returns the resolved context and the IP validation result.
- `extractRoomContextFromHeaders(headers)` – reconstructs the forwarded room context from middleware headers.

Because the resolver caches every lookup within the request scope, downstream consumers do not need to query `rooms` again.

## Server Consumption

Server components, layouts, and route handlers can reuse the resolved context:

```typescript
import { getRequestRoomContext } from '@/lib/rooms/server-context'

export default async function RoomLayout({ children }: { children: React.ReactNode }) {
  const room = getRequestRoomContext()

  if (!room) {
    // room segment was invalid – consider redirecting or showing a 404
    redirect('/rooms')
  }

  return <RoomShell roomId={room.id}>{children}</RoomShell>
}
```

`getRequestRoomContext` simply reads the headers populated by the middleware and returns `{ id, code | null }`.

API route helpers (`requireOperatorAccess`, `requireAdminAccess`) call into `createRoomResolver` directly to re-check access or when the middleware was bypassed (e.g., invoked from non-routed contexts).

## Canonical Redirects

When a user visits `/rooms/<uuid>/admin`, the middleware translates the request to `/rooms/<slug>/admin` if a slug exists. This ensures:

- Bookmarks and shares use the pretty slug.
- Analytics and logs aggregate under one canonical URL.
- Subsequent navigation within the app continues with the slugged path.

Requests to player-facing pages (`/rooms/<uuid>`) receive the same treatment. If no slug is defined, the UUID remains in the URL, and access checks still operate against the room ID.

## Implementation Notes

- The resolver only selects `rooms.id` and `rooms.code`, minimising payload size.
- IP validation is cached for the current request and reuses the same Supabase client instance.
- Downstream code should prefer using the forwarded `x-room-id` header instead of re-parsing the URL.
- Operators attempting to access another room’s admin panel are redirected to their assigned room using `roomResolver.buildRoomPath`.

## Related Files

- `middleware.ts` – core flow enforcing canonical URLs and forwarding headers.
- `lib/rooms/context.ts` – resolver implementation and helpers.
- `lib/rooms/server-context.ts` – server-side accessor for forwarded context.
- `lib/auth/server-auth.ts` – API guards that reuse the resolver for IP checks and role enforcement.
- `docs/ip-restrictions.md` – additional details on IP validation and admin guard behaviour.

Keep this document up to date whenever the room resolution strategy changes or new headers are introduced.
