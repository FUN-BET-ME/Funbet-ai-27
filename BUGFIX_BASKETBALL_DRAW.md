# Bug Fix: Basketball Draw Column Issue

## Date: November 22, 2025

## Issue
Basketball matches were incorrectly showing a "Draw" or "Tie/Draw" column in the bookmaker odds table. Basketball games cannot end in a draw, so they should only show Home and Away columns (2 columns total).

## Root Cause
The `sportAllowsDraws` logic in both `OddsTable.jsx` and `LiveOdds.jsx` was not explicitly excluding basketball. The logic only checked for soccer/cricket/football but did not explicitly filter out basketball.

### Affected Files:
1. `/app/frontend/src/components/OddsTable.jsx` (line 903-904)
2. `/app/frontend/src/pages/LiveOdds.jsx` (line 1046-1047)

### OddsTable.jsx
**Before:**
```javascript
const sportAllowsDraws = (sportKey.includes('soccer') || sportKey.includes('cricket')) ||
                        (matchSportTitle.includes('football') || matchSportTitle.includes('cricket'));
```

**After:**
```javascript
const isBasketball = sportKey.includes('basketball') || matchSportTitle.includes('basketball');
const sportAllowsDraws = !isBasketball && (
  (sportKey.includes('soccer') || sportKey.includes('cricket')) ||
  (matchSportTitle.includes('football') || matchSportTitle.includes('cricket'))
);
```

### LiveOdds.jsx
**Before:**
```javascript
const sportAllowsDraws = !league?.toLowerCase().includes('baseball') && 
                        !league?.toLowerCase().includes('mlb');
```

**After:**
```javascript
const sportKey = match.sport_key?.toLowerCase() || '';
const leagueLower = league?.toLowerCase() || '';
const isBasketball = sportKey.includes('basketball') || leagueLower.includes('basketball') || leagueLower.includes('nba');
const isBaseball = leagueLower.includes('baseball') || leagueLower.includes('mlb');
const sportAllowsDraws = !isBasketball && !isBaseball && (
  sportKey.includes('soccer') || sportKey.includes('cricket') ||
  leagueLower.includes('football') || leagueLower.includes('cricket')
);
```

## Testing
### Test Case 1: Basketball Match
- **Match**: CSU Bakersfield Roadrunners vs Miss Valley St Delta Devils
- **Expected**: 2 columns (Home | Away)
- **Result**: ✅ PASS - Only 2 columns showing

### Test Case 2: Football Match  
- **Match**: Bari vs Frosinone
- **Expected**: 3 columns (Home | Draw | Away)
- **Result**: ✅ PASS - 3 columns showing correctly

### Test Case 3: More Basketball
- **Match**: Marquette Golden Eagles vs Central Michigan Chippewas
- **Expected**: 2 columns (Home | Away)
- **Result**: ✅ PASS - Only 2 columns showing

## Impact
- Basketball matches now correctly show only 2 outcome columns (Home and Away)
- Football and cricket matches continue to show 3 columns (Home, Draw, Away) as expected
- No impact on existing functionality for other sports

## Related Issues
This fix ensures consistency across all sports types and prevents confusion for users betting on basketball matches.
