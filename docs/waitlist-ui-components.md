# Waitlist UI Components

## Overview

This document outlines the UI components required for the enhanced waitlist management system, covering both player-facing and admin interfaces.

## Admin Interface Components

### 1. Waitlist Management Page

#### Main Layout Structure

```typescript
interface WaitlistPageProps {
  roomId: string
  operator: Operator
}

export function WaitlistPage({ roomId, operator }: WaitlistPageProps): JSX.Element {
  return (
    <div className="waitlist-page">
      <WaitlistHeader roomId={roomId} />
      <WaitlistSearchAndFilters roomId={roomId} />
      <WaitlistEntriesList roomId={roomId} />
      <VoidedEntriesSection roomId={roomId} />
      <AddPlayerDialog roomId={roomId} />
    </div>
  )
}
```

#### WaitlistHeader Component

```typescript
interface WaitlistHeaderProps {
  roomId: string
}

export function WaitlistHeader({ roomId }: WaitlistHeaderProps): JSX.Element {
  return (
    <div className="waitlist-header">
      <div className="header-content">
        <h1>Waitlist Management</h1>
        <div className="header-actions">
          <Button onClick={openAddPlayerDialog}>
            <Plus className="w-4 h-4" />
            Add Player
          </Button>
          <Button variant="outline" onClick={openSettingsDialog}>
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>
      <WaitlistStats roomId={roomId} />
    </div>
  )
}
```

#### WaitlistStats Component

```typescript
interface WaitlistStatsProps {
  roomId: string
}

export function WaitlistStats({ roomId }: WaitlistStatsProps): JSX.Element {
  const { data: stats } = useWaitlistStats(roomId)

  return (
    <div className="waitlist-stats">
      <StatCard
        title="Total Waiting"
        value={stats?.totalWaiting || 0}
        icon={<Users className="w-4 h-4" />}
      />
      <StatCard
        title="Called In"
        value={stats?.calledIn || 0}
        icon={<Phone className="w-4 h-4" />}
      />
      <StatCard
        title="Notified"
        value={stats?.notified || 0}
        icon={<Bell className="w-4 h-4" />}
      />
      <StatCard
        title="Average Wait"
        value={formatDuration(stats?.averageWaitTime)}
        icon={<Clock className="w-4 h-4" />}
      />
    </div>
  )
}
```

### 2. Search and Filters

#### WaitlistSearchAndFilters Component

```typescript
interface WaitlistSearchAndFiltersProps {
  roomId: string
  onFiltersChange: (filters: WaitlistFilters) => void
}

interface WaitlistFilters {
  search: string
  gameId?: string
  status?: WaitlistStatus
  entryMethod?: EntryMethod
  showVoided: boolean
}

export function WaitlistSearchAndFilters({
  roomId,
  onFiltersChange
}: WaitlistSearchAndFiltersProps): JSX.Element {
  const [filters, setFilters] = useState<WaitlistFilters>({
    search: '',
    showVoided: false
  })

  const { data: games } = useGames(roomId)

  return (
    <div className="search-filters">
      <div className="search-bar">
        <Search className="w-4 h-4" />
        <Input
          placeholder="Search by player alias..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      <div className="filters">
        <Select
          value={filters.gameId || 'all'}
          onValueChange={(value) => updateFilter('gameId', value === 'all' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            {games?.map(game => (
              <SelectItem key={game.id} value={game.id}>
                {game.name} - {formatStakes(game)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="calledin">Called In</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.entryMethod || 'all'}
          onValueChange={(value) => updateFilter('entryMethod', value === 'all' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Entry Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entry Methods</SelectItem>
            <SelectItem value="callin">Call-in</SelectItem>
            <SelectItem value="inperson">In-person</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-voided"
            checked={filters.showVoided}
            onCheckedChange={(checked) => updateFilter('showVoided', checked)}
          />
          <Label htmlFor="show-voided">Show Voided</Label>
        </div>
      </div>
    </div>
  )
}
```

### 3. Waitlist Entries List

#### WaitlistEntriesList Component

```typescript
interface WaitlistEntriesListProps {
  roomId: string
  filters: WaitlistFilters
}

export function WaitlistEntriesList({ roomId, filters }: WaitlistEntriesListProps): JSX.Element {
  const { data: waitlistData, loading, refetch } = useWaitlistRealtime(roomId, filters)

  if (loading) {
    return <WaitlistSkeleton />
  }

  return (
    <div className="waitlist-entries">
      <div className="entries-header">
        <h2>Active Waitlist ({waitlistData?.active_entries.length || 0})</h2>
        <div className="header-actions">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="entries-list">
        {waitlistData?.active_entries.map((entry, index) => (
          <WaitlistEntryCard
            key={entry.id}
            entry={entry}
            position={index + 1}
            onUpdate={refetch}
          />
        ))}
      </div>

      {waitlistData?.active_entries.length === 0 && (
        <EmptyState
          title="No active waitlist entries"
          description="Players will appear here when they join the waitlist"
        />
      )}
    </div>
  )
}
```

#### WaitlistEntryCard Component

```typescript
interface WaitlistEntryCardProps {
  entry: WaitlistEntry
  position: number
  onUpdate: () => void
}

export function WaitlistEntryCard({ entry, position, onUpdate }: WaitlistEntryCardProps): JSX.Element {
  const [isActionLoading, setIsActionLoading] = useState(false)

  const statusConfig = getStatusConfig(entry.status)
  const timeInQueue = calculateTimeInQueue(entry.created_at)
  const timeRemaining = calculateTimeRemaining(entry, statusConfig)

  return (
    <Card className="waitlist-entry-card">
      <CardContent className="p-4">
        <div className="entry-header">
          <div className="position-info">
            <Badge variant="outline" className="position-badge">
              #{position}
            </Badge>
            <div className="player-info">
              <h3 className="player-name">{entry.player.alias}</h3>
              <p className="game-info">
                {entry.game.name} - {formatStakes(entry.game)}
              </p>
            </div>
          </div>

          <div className="status-info">
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
            {entry.entry_method === 'callin' && (
              <Badge variant="secondary" className="ml-2">
                <Phone className="w-3 h-3 mr-1" />
                Call-in
              </Badge>
            )}
            {entry.other_game_entries.length > 0 && (
              <Badge variant="outline" className="ml-2">
                <Users className="w-3 h-3 mr-1" />
                Multi-game
              </Badge>
            )}
          </div>
        </div>

        <div className="entry-details">
          <div className="time-info">
            <div className="time-in-queue">
              <Clock className="w-4 h-4" />
              <span>In queue: {formatDuration(timeInQueue)}</span>
            </div>
            {timeRemaining && (
              <div className="time-remaining">
                <Timer className="w-4 h-4" />
                <span>Time left: {formatDuration(timeRemaining)}</span>
              </div>
            )}
          </div>

          {entry.notes && (
            <div className="notes">
              <FileText className="w-4 h-4" />
              <span>{entry.notes}</span>
            </div>
          )}
        </div>

        <div className="entry-actions">
          <WaitlistEntryActions
            entry={entry}
            onAction={handleAction}
            loading={isActionLoading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

#### WaitlistEntryActions Component

```typescript
interface WaitlistEntryActionsProps {
  entry: WaitlistEntry
  onAction: (action: string, data?: any) => Promise<void>
  loading: boolean
}

export function WaitlistEntryActions({ entry, onAction, loading }: WaitlistEntryActionsProps): JSX.Element {
  const statusConfig = getStatusConfig(entry.status)

  return (
    <div className="entry-actions">
      {statusConfig.actions.map(action => (
        <Button
          key={action}
          variant={getActionVariant(action)}
          size="sm"
          onClick={() => handleAction(action)}
          disabled={loading}
        >
          {getActionIcon(action)}
          {getActionLabel(action)}
        </Button>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleAction('move-up')}>
            <ArrowUp className="w-4 h-4 mr-2" />
            Move Up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('move-down')}>
            <ArrowDown className="w-4 h-4 mr-2" />
            Move Down
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('move-to-top')}>
            <ArrowUpToLine className="w-4 h-4 mr-2" />
            Move to Top
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('move-to-bottom')}>
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Move to Bottom
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleAction('edit-notes')}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Notes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

### 4. Add Player Dialog

#### AddPlayerDialog Component

```typescript
interface AddPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  onPlayerAdded: () => void
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  roomId,
  onPlayerAdded
}: AddPlayerDialogProps): JSX.Element {
  const [entryMethod, setEntryMethod] = useState<'callin' | 'inperson'>('callin')
  const [playerMode, setPlayerMode] = useState<'alias' | 'player'>('alias')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Player to Waitlist</DialogTitle>
          <DialogDescription>
            Add a player to the waitlist for a specific game
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="entry-method-selection">
            <Label>Entry Method</Label>
            <RadioGroup value={entryMethod} onValueChange={setEntryMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="callin" id="callin" />
                <Label htmlFor="callin">Call-in (Remote)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inperson" id="inperson" />
                <Label htmlFor="inperson">In-person Check-in</Label>
              </div>
            </RadioGroup>
          </div>

          <PlayerSelection
            mode={playerMode}
            onModeChange={setPlayerMode}
            roomId={roomId}
          />

          <GameSelection roomId={roomId} />

          {entryMethod === 'inperson' && (
            <div className="check-in-options">
              <div className="flex items-center space-x-2">
                <Checkbox id="check-in-immediately" />
                <Label htmlFor="check-in-immediately">
                  Check in immediately (player is present)
                </Label>
              </div>
            </div>
          )}

          <NotesField />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddPlayer}>
            Add to Waitlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### PlayerSelection Component

```typescript
interface PlayerSelectionProps {
  mode: 'alias' | 'player'
  onModeChange: (mode: 'alias' | 'player') => void
  roomId: string
}

export function PlayerSelection({ mode, onModeChange, roomId }: PlayerSelectionProps): JSX.Element {
  const { data: activePlayers } = useActivePlayers(roomId)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [alias, setAlias] = useState('')

  return (
    <div className="player-selection">
      <div className="selection-mode">
        <Label>Player Selection</Label>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="alias"
              id="alias-mode"
              checked={mode === 'alias'}
              onCheckedChange={() => onModeChange('alias')}
            />
            <Label htmlFor="alias-mode">Enter Alias</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="player"
              id="player-mode"
              checked={mode === 'player'}
              onCheckedChange={() => onModeChange('player')}
            />
            <Label htmlFor="player-mode">Select Active Player</Label>
          </div>
        </div>
      </div>

      {mode === 'alias' ? (
        <div className="alias-input">
          <Label htmlFor="player-alias">Player Alias</Label>
          <Input
            id="player-alias"
            placeholder="Enter player alias..."
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </div>
      ) : (
        <div className="player-select">
          <Label>Select Player</Label>
          <Select value={selectedPlayer?.id || ''} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Select an active player..." />
            </SelectTrigger>
            <SelectContent>
              {activePlayers?.map(player => (
                <SelectItem key={player.id} value={player.id}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={player.avatar_url} />
                      <AvatarFallback>{player.alias[0]}</AvatarFallback>
                    </Avatar>
                    <span>{player.alias}</span>
                    <Badge variant="outline" className="text-xs">
                      {player.current_table.name}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
```

### 5. Voided Entries Section

#### VoidedEntriesSection Component

```typescript
interface VoidedEntriesSectionProps {
  roomId: string
  filters: WaitlistFilters
}

export function VoidedEntriesSection({ roomId, filters }: VoidedEntriesSectionProps): JSX.Element {
  const { data: voidedEntries, loading } = useVoidedEntries(roomId, filters)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!filters.showVoided || voidedEntries?.length === 0) {
    return null
  }

  return (
    <div className="voided-entries-section">
      <div className="voided-header">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
        >
          <span>Voided Entries ({voidedEntries?.length || 0})</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {isExpanded && (
        <div className="voided-entries-list">
          {voidedEntries?.map(entry => (
            <VoidedEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### VoidedEntryCard Component

```typescript
interface VoidedEntryCardProps {
  entry: WaitlistEntry
}

export function VoidedEntryCard({ entry }: VoidedEntryCardProps): JSX.Element {
  const getExpiryReason = (entry: WaitlistEntry): string => {
    if (entry.cancelled_by === 'system') {
      if (entry.status === 'expired') {
        if (entry.entry_method === 'callin') {
          return 'Did not check in (called in)'
        } else {
          return 'Did not show (notified)'
        }
      }
    }
    return 'Cancelled'
  }

  return (
    <Card className="voided-entry-card">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="player-info">
            <h4 className="font-medium">{entry.player.alias}</h4>
            <p className="text-sm text-muted-foreground">
              {entry.game.name} - {formatStakes(entry.game)}
            </p>
          </div>

          <div className="void-info">
            <Badge variant="destructive">
              {getExpiryReason(entry)}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(entry.cancelled_at || entry.updated_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Player Interface Components

### 1. Join Waitlist Page

#### JoinWaitlistPage Component

```typescript
interface JoinWaitlistPageProps {
  roomId: string
  player: Player
}

export function JoinWaitlistPage({ roomId, player }: JoinWaitlistPageProps): JSX.Element {
  const { data: games } = useAvailableGames(roomId)
  const [selectedGames, setSelectedGames] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  return (
    <div className="join-waitlist-page">
      <div className="page-header">
        <h1>Join Waitlist</h1>
        <p>Select the games you'd like to join the waitlist for</p>
      </div>

      <div className="games-selection">
        <h2>Available Games</h2>
        <div className="games-grid">
          {games?.map(game => (
            <GameCard
              key={game.id}
              game={game}
              selected={selectedGames.includes(game.id)}
              onToggle={(gameId) => toggleGameSelection(gameId)}
            />
          ))}
        </div>
      </div>

      <div className="notes-section">
        <Label htmlFor="waitlist-notes">Notes (Optional)</Label>
        <Textarea
          id="waitlist-notes"
          placeholder="Any special requests or notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="join-actions">
        <Button
          onClick={handleJoinWaitlist}
          disabled={selectedGames.length === 0}
          className="w-full"
        >
          Join Waitlist ({selectedGames.length} games)
        </Button>
      </div>
    </div>
  )
}
```

#### GameCard Component

```typescript
interface GameCardProps {
  game: Game
  selected: boolean
  onToggle: (gameId: string) => void
}

export function GameCard({ game, selected, onToggle }: GameCardProps): JSX.Element {
  return (
    <Card
      className={`game-card cursor-pointer transition-colors ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onToggle(game.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="game-info">
            <h3 className="font-semibold">{game.name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatStakes(game)}
            </p>
            <p className="text-xs text-muted-foreground">
              Max {game.max_players} players
            </p>
          </div>

          <div className="game-status">
            <Badge variant={selected ? 'default' : 'outline'}>
              {selected ? 'Selected' : 'Available'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Utility Components

### 1. Status Badge Component

```typescript
interface StatusBadgeProps {
  status: WaitlistStatus
  showCountdown?: boolean
  timeRemaining?: number
}

export function StatusBadge({ status, showCountdown, timeRemaining }: StatusBadgeProps): JSX.Element {
  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className="status-badge">
      {config.icon && <config.icon className="w-3 h-3 mr-1" />}
      {config.label}
      {showCountdown && timeRemaining && (
        <span className="ml-1">
          ({formatDuration(timeRemaining)})
        </span>
      )}
    </Badge>
  )
}
```

### 2. Countdown Timer Component

```typescript
interface CountdownTimerProps {
  targetTime: string
  onExpire?: () => void
}

export function CountdownTimer({ targetTime, onExpire }: CountdownTimerProps): JSX.Element {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(targetTime).getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))

      if (remaining <= 0) {
        onExpire?.()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetTime, onExpire])

  return (
    <div className="countdown-timer">
      <Timer className="w-4 h-4" />
      <span>{formatDuration(timeRemaining)}</span>
    </div>
  )
}
```

### 3. Empty State Component

```typescript
interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Users className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

## Responsive Design

### Mobile Optimizations

1. **Touch-friendly buttons** - Larger touch targets for mobile
2. **Swipe gestures** - Swipe to reveal actions on entry cards
3. **Collapsible sections** - Stack sections vertically on mobile
4. **Bottom sheet dialogs** - Use bottom sheets for mobile dialogs

### Tablet Optimizations

1. **Two-column layout** - Side-by-side view on tablets
2. **Drag and drop** - Touch-friendly drag and drop for reordering
3. **Split view** - Show details panel alongside list

## Accessibility

### ARIA Labels and Roles

```typescript
// Example of accessible waitlist entry
<div
  role="listitem"
  aria-label={`Player ${entry.player.alias} in position ${position}`}
  className="waitlist-entry"
>
  <div role="group" aria-label="Player information">
    {/* Player details */}
  </div>
  <div role="group" aria-label="Actions">
    {/* Action buttons */}
  </div>
</div>
```

### Keyboard Navigation

1. **Tab order** - Logical tab sequence through interactive elements
2. **Arrow keys** - Navigate between entries with arrow keys
3. **Enter/Space** - Activate buttons and toggles
4. **Escape** - Close dialogs and menus

### Screen Reader Support

1. **Live regions** - Announce status changes and updates
2. **Descriptive labels** - Clear labels for all interactive elements
3. **Status announcements** - Announce position changes and status updates

