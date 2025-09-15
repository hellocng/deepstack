# Database Migrations

This document outlines database schema changes needed for the DeepStack application.

## Color Theme Feature

### Overview

Added color theme preferences to the `players` table to allow users to save their preferred color theme to their account instead of using local storage.

### Migration Required

#### Add color_theme column to players table

```sql
-- Add color_theme column to players table
ALTER TABLE players
ADD COLUMN color_theme VARCHAR(50) DEFAULT 'neutral';

-- Add comment for documentation
COMMENT ON COLUMN players.color_theme IS 'User preferred color theme (neutral, slate, violet, blue, green, red, orange, yellow, pink, zinc, stone, gray, emerald, teal, cyan, sky, indigo, purple, fuchsia, rose)';

-- Create index for better query performance (optional)
CREATE INDEX idx_players_color_theme ON players(color_theme);
```

### Available Theme Values

The following color themes are supported:

- `neutral` (default)
- `slate`
- `violet`
- `blue`
- `green`
- `red`
- `orange`
- `yellow`
- `pink`
- `zinc`
- `stone`
- `gray`
- `emerald`
- `teal`
- `cyan`
- `sky`
- `indigo`
- `purple`
- `fuchsia`
- `rose`

### Implementation Notes

- Default value is `'neutral'` to maintain backward compatibility
- Column is nullable to handle existing records
- Theme preferences are applied globally across the application
- Each theme supports both light and dark modes
- Changes are applied in real-time without requiring page refresh

### Testing

After implementing the migration:

1. Verify existing players have `color_theme` set to `'neutral'`
2. Test theme switching on the profile page
3. Confirm theme preferences persist across sessions
4. Verify theme applies correctly in both light and dark modes

### Rollback (if needed)

```sql
-- Remove color_theme column
ALTER TABLE players DROP COLUMN color_theme;
```
