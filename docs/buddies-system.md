# Buddies System Documentation

## Overview

The Buddies system allows poker players to connect with each other and see where their friends are playing. This feature is designed to encourage more play by enabling players to find and join games with their poker buddies while maintaining strict privacy controls.

## Core Concept

The buddies system is **not mutual by default**. Each player must explicitly request to add another player as a buddy, and the other player must explicitly accept. This ensures full consent and privacy protection.

## How It Works

### 1. Finding and Adding Buddies

**Step 1: Generate QR Code**

- Player A wants to add Player B as a buddy
- Player A opens the "Add Buddy" screen in the app
- Player A's app generates a QR code containing their player ID

**Step 2: Scan QR Code**

- Player B opens the "Add Buddy" screen in their app
- Player B scans Player A's QR code using their phone's camera
- Player B's app reads Player A's player ID from the QR code

**Step 3: Verification & Consent**

- Player B receives a buddy request notification for Player A
- Player B must explicitly accept the request in the app
- This creates a one-way relationship: Player A can see Player B's location

**Step 4: Mutual Relationship (Optional)**

- If Player B also wants to see Player A's location, they must make a separate request
- Player B generates their own QR code for Player A to scan
- Player A would then need to accept Player B's request
- This creates a mutual relationship where both can see each other's locations

### 2. Privacy Controls

Players have granular control over their location visibility:

#### Global Settings

- **Turn Off to All**: Hide location from all buddies
- **Turn On to All**: Show location to all buddies

#### Individual Settings

- **Per-Buddy Control**: Turn visibility on/off for specific buddies
- **Selective Sharing**: Show location to some buddies but not others

### 3. Managing Buddies

#### Removing Buddies

- Players can remove any buddy at any time
- When a buddy is removed, the relationship is completely severed
- To re-add, the requesting player must generate a new QR code for scanning
- This ensures ongoing consent and prevents unwanted re-connections

#### Re-adding Buddies

- If players want to reconnect after removal, they must go through the full process again
- Request → QR code generation/scanning → Explicit acceptance
- No automatic re-connection is possible

## Database Schema

```sql
buddies: {
  id: string                    -- Unique identifier
  player_id: string | null      -- The player who initiated the request
  buddy_id: string | null       -- The player who is the buddy
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string | null
  updated_at: string | null
}
```

### Status Meanings

- **`pending`**: Request sent, waiting for acceptance
- **`accepted`**: Request accepted, relationship active
- **`blocked`**: Request rejected or relationship blocked

## Privacy & Consent Model

### Why This Design?

1. **Privacy Protection**: Players can only see locations of people who have explicitly consented
2. **Non-Mutual by Default**: Each direction of the relationship requires separate consent
3. **Ongoing Consent**: Removing and re-adding requires fresh consent
4. **Granular Control**: Players can control visibility per buddy or globally

### Consent Flow

```
Player A → [Generate QR Code] → Player B scans QR
Player B → [Explicit acceptance] → Relationship Created
Player A can now see Player B's location

If Player B wants to see Player A:
Player B → [Generate QR Code] → Player A scans QR
Player A → [Explicit acceptance] → Mutual Relationship
```

## User Experience

### For the QR Code Generator

1. Open "Add Buddy" screen
2. Generate QR code with player ID
3. Show QR code to other player
4. Wait for acceptance notification
5. Once accepted, can see buddy's current game location
6. Can control visibility settings

### For the QR Code Scanner

1. Open "Add Buddy" screen
2. Scan other player's QR code
3. Review the buddy request
4. Accept or decline
5. If accepted, QR generator can see their location
6. Can control their own visibility settings

## Business Benefits

### Increased Engagement

- **Social Gaming**: Players are more likely to play when they know friends are playing
- **Game Discovery**: Players can find games their buddies are in
- **Retention**: Social connections increase player retention

### Privacy-First Approach

- **Trust**: Players trust the system because they control their privacy
- **Compliance**: Meets privacy regulations and user expectations
- **User Satisfaction**: Players feel safe using the feature

## Technical Implementation

### Key Features to Build

1. **QR Code System**
   - Generate QR codes containing player IDs
   - QR code scanning functionality
   - Notification system for incoming requests
   - Accept/decline interface

2. **Location Sharing**
   - Real-time game location updates
   - Privacy controls (global and per-buddy)
   - Location history (optional)

3. **Buddy Management**
   - List of current buddies
   - Remove buddy functionality
   - Visibility controls

4. **Game Discovery**
   - "Buddies Playing" section
   - Join game with buddy feature
   - Buddy activity feed

### API Endpoints Needed

```
GET  /api/buddies/qr-code          # Generate QR code with player ID
POST /api/buddies/scan             # Process scanned QR code and create request
GET  /api/buddies/requests         # Get pending buddy requests
POST /api/buddies/accept           # Accept a buddy request
POST /api/buddies/decline          # Decline a buddy request
GET  /api/buddies                  # Get current buddies list
DELETE /api/buddies/:id            # Remove a buddy
PUT  /api/buddies/:id/visibility   # Update visibility settings
GET  /api/buddies/playing          # Get buddies currently playing
```

## Security Considerations

### QR Code Security

- QR codes contain only player IDs (no sensitive information)
- Implement rate limiting on QR code generation and scanning
- Validate QR code content before processing requests
- Add expiration time to QR codes (e.g., 5 minutes)

### Privacy Controls

- Default to most restrictive privacy settings
- Clear consent language in UI
- Easy access to privacy controls
- Audit trail of consent actions

### Data Minimization

- Only store necessary data for the relationship
- Implement data retention policies
- Allow complete data deletion when removing buddies

## Future Enhancements

### Advanced Features

- **Buddy Groups**: Create groups of buddies
- **Activity Notifications**: Notify when buddies join/leave games
- **Buddy Recommendations**: Suggest buddies based on playing patterns
- **Temporary Sharing**: Share location for specific time periods

### Analytics

- **Usage Metrics**: Track how often players use buddy features
- **Engagement Impact**: Measure impact on game participation
- **Privacy Metrics**: Monitor privacy setting usage

## Compliance Notes

### GDPR/Privacy Regulations

- Clear consent mechanisms
- Right to data deletion
- Data portability options
- Privacy by design principles

### Terms of Service

- Clear explanation of location sharing
- User responsibilities for consent
- Consequences of misuse
- Data usage policies

---

_This documentation should be reviewed and updated as the buddies system evolves and new features are added._
