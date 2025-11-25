# Feature Added: Date & Time Display for Upcoming Matches

## 📅 What Was Added

**Date and Start Time** now displayed for all upcoming matches in the LiveOdds page.

## 🎨 Display Format

**Location**: Centered between team names (where "vs" appears)

**Format**:
```
vs
┌─────────────┐
│  Nov 26     │  ← Date (Short month + day)
│  8:00 PM    │  ← Time (12-hour format with AM/PM)
└─────────────┘
```

**Styling**:
- Gold date text (`#FFD700`)
- Gray time text
- Purple background with border
- Compact, readable design

## 🔍 Logic

**Shows when**:
- Match has NOT started yet (commence_time > now)
- Match does NOT have live score data
- Match is truly upcoming

**Does NOT show for**:
- Live matches (shows score instead)
- Completed matches (shows final score instead)
- Matches that already started

## 📱 Responsive Design

- Works on mobile and desktop
- Flexbox layout ensures proper alignment
- Text remains readable at all screen sizes

## 🛠️ Technical Details

**File**: `/app/frontend/src/pages/LiveOdds.jsx` (lines 1071-1109)

**Implementation**:
- Uses JavaScript `Date` object for parsing
- `toLocaleDateString()` for date formatting
- `toLocaleTimeString()` for time formatting (12-hour with AM/PM)
- Calculates hours until match to determine if it's upcoming
- Error handling for invalid date formats

**Date Format Options**:
- Shows year only if different from current year
- Example: "Nov 26" (same year) or "Nov 26, 2026" (different year)

## ✅ Result

Users can now easily see:
- **When** upcoming matches will start
- **What date** matches are scheduled
- **What time** to tune in

No more guessing or having to click through to see match schedules!
