# Sorting Arrows UI Update ✅

## What Changed

The sorting arrows in the odds tables have been updated to be **more visible** as requested.

### Visual Changes

#### Before:
- **Size**: `w-4 h-4` (16px × 16px)
- **Active Color**: Gold `#FFD700`
- **Inactive**: Up arrow with 30% opacity

#### After:
- **Size**: `w-5 h-5` (20px × 20px) - **25% BIGGER**
- **Active Color**: Purple `#9333ea` (purple-600) - **MORE VISIBLE**
- **Inactive**: Up arrow with 30% opacity (unchanged)

### Files Updated

1. `/app/frontend/src/components/OddsTable.jsx`
   - Lines 684, 686: Home team sorting arrow
   - Lines 708, 710: Draw sorting arrow
   - Lines 732, 734: Away team sorting arrow

2. `/app/frontend/src/pages/LiveOdds.jsx`
   - Lines 1453, 1455: Home team sorting arrow
   - Lines 1483, 1485: Draw sorting arrow
   - Lines 1505, 1507: Away team sorting arrow

### How It Works

**When a column is NOT sorted:**
- Shows an **UP** chevron arrow (↑)
- 30% opacity (semi-transparent)
- Size: 20px × 20px

**When a column IS sorted:**
- Shows a **DOWN** chevron arrow (↓)
- **Bright purple color** (#9333ea)
- Size: 20px × 20px

### User Experience

Users can now:
✅ Easily see which column is being sorted (purple down arrow)
✅ See inactive sort options more clearly (bigger size)
✅ Click on team name headers to sort odds by that outcome

### Testing

The changes are live in both:
- Main odds page (LiveOdds.jsx)
- Odds table component (OddsTable.jsx)

All sports (Football, Basketball, Cricket) will show the updated sorting arrows.
