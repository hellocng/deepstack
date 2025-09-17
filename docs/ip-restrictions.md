# IP Restrictions for Multitenant Admin Access

## Overview

The IP restriction system allows poker room operators to restrict admin access to specific IP addresses or IP ranges. This is particularly useful for ensuring that admin access is only available from the physical poker room location or authorized remote locations.

## Features

- **Per-Room Configuration**: Each poker room can have its own IP restrictions
- **Flexible IP Patterns**: Supports exact IPs, CIDR ranges, and wildcard patterns
- **Admin-Only Restrictions**: IP restrictions only apply to admin routes, not player routes
- **Security Monitoring**: Logs violation attempts for security analysis
- **User-Friendly Errors**: Clear error messages for blocked users
- **Database-Driven**: IP restrictions are stored in the database and manageable through the admin interface

## Database Schema

The IP restriction system uses a separate `room_ip_restrictions` table with proper Row Level Security (RLS) policies:

```sql
CREATE TABLE room_ip_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  allowed_ips TEXT[] DEFAULT NULL,
  ip_restriction_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id)
);
```

### Field Descriptions

- `room_id`: Foreign key reference to the rooms table
- `allowed_ips`: Array of allowed IP addresses, CIDR ranges, or wildcard patterns
- `ip_restriction_enabled`: Boolean flag to enable/disable IP restrictions for the room

### Security Model

The `room_ip_restrictions` table has strict RLS policies that ensure:

- **Only room admins** can view, insert, update, or delete IP restrictions for their room
- **No public access** to IP restriction data
- **Automatic cleanup** when rooms are deleted (CASCADE)
- **One-to-one relationship** with rooms (UNIQUE constraint on room_id)

## IP Pattern Support

### 1. Exact IP Addresses

```
192.168.1.100
10.0.0.1
203.0.113.5
```

### 2. CIDR Ranges

```
192.168.1.0/24    # 192.168.1.1 - 192.168.1.254
10.0.0.0/8        # 10.0.0.1 - 10.255.255.254
172.16.0.0/12     # 172.16.0.1 - 172.31.255.254
```

### 3. Wildcard Patterns

```
192.168.1.*       # 192.168.1.1 - 192.168.1.255
10.0.*.*          # 10.0.0.1 - 10.0.255.255
```

## Security Architecture

### Row Level Security (RLS) Policies

The `room_ip_restrictions` table implements strict RLS policies:

```sql
-- Only room admins can view IP restrictions for their room
CREATE POLICY "Room admins can view their room IP restrictions" ON room_ip_restrictions
  FOR SELECT
  USING (
    room_id IN (
      SELECT r.id
      FROM rooms r
      INNER JOIN operators o ON o.room_id = r.id
      WHERE o.auth_id = auth.uid()
      AND o.role IN ('admin', 'superadmin')
      AND o.is_active = true
    )
  );
```

### Secure Function Access

IP restrictions are accessed through a secure database function:

```sql
CREATE OR REPLACE FUNCTION get_room_ip_restrictions(room_code_param TEXT)
RETURNS TABLE(
  allowed_ips TEXT[],
  ip_restriction_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rir.allowed_ips,
    rir.ip_restriction_enabled
  FROM room_ip_restrictions rir
  INNER JOIN rooms r ON r.id = rir.room_id
  WHERE r.code = room_code_param
  AND r.is_active = true;
END;
$$;
```

This function:

- Uses `SECURITY DEFINER` to bypass RLS for middleware access
- Only returns IP restriction data, not sensitive room information
- Validates room existence and active status
- Is accessible to authenticated users for middleware validation

## Implementation Details

### 1. Middleware Integration

The IP validation is integrated into the Next.js middleware and runs before authentication checks:

```typescript
// middleware.ts
if (isAdminRoute(pathname)) {
  const room = extractRoomFromPath(pathname)
  if (room) {
    const ipValidation = await validateIPAccess(req, room, supabase)

    if (!ipValidation.isAllowed) {
      // Redirect to signin with error message
      const errorUrl = new URL(`/rooms/${room}/admin/signin`, req.url)
      errorUrl.searchParams.set('error', 'ip_restricted')
      errorUrl.searchParams.set('ip', ipValidation.clientIP)
      return NextResponse.redirect(errorUrl)
    }
  }
}
```

### 2. IP Detection

The system checks multiple headers to determine the real client IP:

```typescript
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  // Priority order for IP detection
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()

  return request.ip || 'unknown'
}
```

### 3. API Route Protection

API routes can use the enhanced server auth functions:

```typescript
// For operator access with IP validation
export async function requireOperatorAccess(
  request: NextRequest,
  roomCode: string
): Promise<{ user: ServerUser; operatorData: any }> {
  // Validates authentication, IP restrictions, and room access
}

// For admin access with IP validation
export async function requireAdminAccess(
  request: NextRequest,
  roomCode: string
): Promise<{ user: ServerUser; operatorData: any }> {
  // Validates authentication, IP restrictions, admin role, and room access
}
```

## Configuration

### 1. Room Management Interface

Room administrators can configure IP restrictions through the room settings form:

- **Enable/Disable**: Toggle IP restrictions on/off
- **IP List**: Enter allowed IP addresses, one per line
- **Validation**: Real-time validation of IP patterns
- **Examples**: Built-in examples for different IP pattern types

### 2. Form Validation

The system validates IP patterns in real-time:

```typescript
const { validIPs, errors } = parseIPRestrictions(input)
```

Supported validation:

- IPv4 address format validation
- CIDR notation validation
- Wildcard pattern validation
- Duplicate detection

## Security Features

### 1. Violation Logging

All IP restriction violations are logged with detailed information:

```typescript
interface IPViolationLog {
  timestamp: string
  clientIP: string
  roomCode: string
  userAgent: string
  path: string
  type: 'ip_restriction_violation'
  reason?: string
}
```

### 2. Rate Limiting

Built-in rate limiting to prevent brute force attacks:

- **Default**: 5 attempts per 15 minutes per IP
- **Configurable**: Adjustable limits and time windows
- **Automatic Reset**: Resets after successful authentication

### 3. Suspicious Activity Detection

The system detects and logs suspicious IP patterns:

- Invalid IP addresses (0.0.0.0, 127.0.0.1 in production)
- Link-local addresses (169.254.x.x)
- Multicast addresses (224.x.x.x)
- Broadcast addresses (255.x.x.x)

## Error Handling

### 1. User-Facing Errors

When IP access is denied, users see a clear error message:

```
Access denied from your IP address
Your IP address (192.168.1.100) is not authorized to access this room's admin panel.
Please contact your administrator to add your IP to the allowed list.
```

### 2. Admin Notifications

Administrators can monitor IP restriction violations through:

- Console logs (development)
- External monitoring services (production)
- Database logs (if configured)

## Usage Examples

### 1. Basic Room Setup

```typescript
// Create room first
const roomData = {
  name: 'The Royal Flush',
  code: 'royal-flush',
  // ... other room fields
}

// Then create IP restrictions separately
const ipRestrictions = {
  room_id: roomId,
  ip_restriction_enabled: true,
  allowed_ips: [
    '192.168.1.0/24', // Local network
    '10.0.0.1', // Specific IP
    '203.0.113.0/24', // Office network
  ],
}
```

### 2. API Route Protection

```typescript
// app/api/rooms/[room]/admin/games/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { room: string } }
) {
  try {
    const { user, operatorData } = await requireAdminAccess(
      request,
      params.room
    )

    // Proceed with admin operations
    // IP restrictions are automatically enforced
  } catch (error) {
    return Response.json({ error: error.message }, { status: 403 })
  }
}
```

### 3. Managing IP Restrictions

```typescript
// Get IP restrictions for a room (admin only)
const restrictions = await getRoomIPRestrictions(supabase, roomId)

// Create or update IP restrictions (admin only)
const result = await upsertRoomIPRestrictions(supabase, roomId, {
  allowed_ips: ['192.168.1.0/24', '10.0.0.1'],
  ip_restriction_enabled: true,
})

// Delete IP restrictions (admin only)
await deleteRoomIPRestrictions(supabase, roomId)
```

### 4. Monitoring Violations

```typescript
// Log IP violations for security monitoring
await logIPViolation(
  clientIP,
  roomCode,
  userAgent,
  path,
  'IP address not in allowed list'
)
```

## Best Practices

### 1. IP Range Planning

- **Use CIDR ranges** for office networks (e.g., `192.168.1.0/24`)
- **Use exact IPs** for specific workstations
- **Test thoroughly** before enabling in production
- **Document IP ranges** for team reference

### 2. Security Considerations

- **Monitor violations** regularly for security threats
- **Use HTTPS** to prevent IP spoofing
- **Consider VPN access** for remote administrators
- **Regular IP audits** to remove unused addresses
- **RLS policies** ensure only authorized admins can manage IP restrictions
- **Separate table** prevents accidental exposure of IP restriction data
- **Secure functions** provide controlled access for middleware validation

### 3. Operational Guidelines

- **Test from different locations** before going live
- **Have backup access methods** (superadmin bypass)
- **Document emergency procedures** for IP lockouts
- **Train staff** on IP restriction management

## Troubleshooting

### 1. Common Issues

**Issue**: Admin can't access from expected IP
**Solution**: Check IP format, verify CIDR ranges, test with exact IP

**Issue**: IP restrictions not working
**Solution**: Verify `ip_restriction_enabled` is true, check middleware logs

**Issue**: False positives in violation logs
**Solution**: Review IP detection logic, check proxy configurations

### 2. Debug Mode

Enable debug logging in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('IP validation result:', ipValidation)
}
```

### 3. Emergency Access

Superadmins can bypass IP restrictions:

```typescript
// Superadmins are not subject to IP restrictions
if (operatorData.role === 'superadmin') {
  // Allow access regardless of IP
}
```

## Migration Guide

### 1. Existing Rooms

Existing rooms will not have IP restrictions configured by default. IP restrictions must be explicitly created for each room:

```sql
-- No automatic migration needed - IP restrictions are opt-in
-- Each room admin must explicitly configure IP restrictions
```

### 2. Gradual Rollout

1. **Test in development** with your IP ranges
2. **Enable for one room** in production
3. **Monitor logs** for any issues
4. **Roll out to other rooms** gradually

### 3. Rollback Plan

To disable IP restrictions:

```sql
-- Disable IP restrictions for all rooms
UPDATE room_ip_restrictions SET ip_restriction_enabled = false;

-- Or delete all IP restrictions entirely
DELETE FROM room_ip_restrictions;
```

## API Reference

### Core Functions

#### `validateIPAccess(request, roomCode, supabase)`

Validates if the client IP is allowed to access the room's admin routes. Uses the secure `get_room_ip_restrictions` function.

**Parameters:**

- `request`: NextRequest object
- `roomCode`: Room code string
- `supabase`: Supabase client instance

**Returns:**

```typescript
{
  isAllowed: boolean
  clientIP: string
  reason?: string
}
```

#### `parseIPRestrictions(input)`

Parses and validates IP restriction input string.

**Parameters:**

- `input`: Newline-separated string of IP patterns

**Returns:**

```typescript
{
  validIPs: string[]
  errors: string[]
}
```

### Room IP Restriction Management

#### `getRoomIPRestrictions(supabase, roomId)`

Gets IP restrictions for a room. Only accessible by room admins due to RLS policies.

#### `upsertRoomIPRestrictions(supabase, roomId, restrictions)`

Creates or updates IP restrictions for a room. Only accessible by room admins due to RLS policies.

#### `deleteRoomIPRestrictions(supabase, roomId)`

Deletes IP restrictions for a room. Only accessible by room admins due to RLS policies.

#### `requireOperatorAccess(request, roomCode)`

Server-side function for API routes requiring operator access with IP validation.

**Parameters:**

- `request`: NextRequest object
- `roomCode`: Room code string

**Returns:**

```typescript
{
  user: ServerUser
  operatorData: any
}
```

**Throws:** Error if access is denied

### Security Functions

#### `logIPViolation(clientIP, roomCode, userAgent, path, reason?)`

Logs IP restriction violations for security monitoring.

#### `shouldRateLimitIP(ip)`

Checks if an IP address should be rate limited.

#### `performSecurityCheck(request, roomCode)`

Comprehensive security check including IP validation and rate limiting.

## Environment Variables

```bash
# Optional: Enable IP restriction logging
IP_RESTRICTION_ENABLED=true

# Optional: External monitoring webhook
MONITORING_WEBHOOK_URL=https://your-monitoring-service.com/webhook

# Optional: Rate limiting configuration
IP_RATE_LIMIT_MAX_ATTEMPTS=5
IP_RATE_LIMIT_WINDOW_MS=900000
```

## Future Enhancements

### Planned Features

1. **IPv6 Support**: Full IPv6 address and range support
2. **Geolocation Restrictions**: Country/region-based restrictions
3. **Time-based Access**: Restrict access to specific hours
4. **Advanced Monitoring**: Integration with SIEM systems
5. **Bulk IP Management**: Import/export IP lists
6. **Audit Trail**: Detailed access logs with IP tracking

### Integration Opportunities

1. **VPN Detection**: Identify and handle VPN connections
2. **Threat Intelligence**: Integration with IP reputation services
3. **Automated Response**: Auto-block suspicious IPs
4. **Mobile App Support**: Special handling for mobile applications
