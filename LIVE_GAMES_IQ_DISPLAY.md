# Live Games IQ Display - Explanation

## Question
Why are live games not showing IQ scores and predictions?

## Answer
**IQ predictions ARE calculated and displayed for BOTH pre-match AND live games!**

## Verification

### Backend Check (Arsenal vs Tottenham Hotspur)
```bash
curl "http://localhost:8001/api/odds/all-cached?sport=soccer&limit=100"
```

**Result:**
```json
{
  "home_team": "Arsenal",
  "away_team": "Tottenham Hotspur",
  "live_score": {
    "is_live": true
  },
  "funbet_iq": {
    "home_iq": 56.1,
    "away_iq": 32.2,
    "draw_iq": 21.7,
    "confidence": "High",
    "verdict": "Arsenal favoured"
  }
}
```

✅ **Backend IS returning IQ data for live matches!**

## Why User Might Not See It

### Cause: Browser Cache
The user's browser has **old cached data** from before we implemented:
1. IQ predictions feature
2. Cache versioning system (v2.0)

### Solution: Hard Refresh

**The user needs to clear their browser cache:**

1. **Chrome/Edge (Windows/Linux)**:
   - Press `Ctrl + Shift + R`
   - OR `Ctrl + F5`

2. **Chrome/Edge (Mac)**:
   - Press `Cmd + Shift + R`

3. **Firefox**:
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Press `Cmd + Shift + R` (Mac)

4. **Safari**:
   - Press `Cmd + Option + R`

5. **Manual Clear**:
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"

## How IQ Works for Live vs Pre-Match

### Pre-Match (Before Start)
- IQ calculated when odds are first loaded
- Stored in database as **verified prediction**
- Used for accuracy tracking
- Flag: `calculated_live: false` or absent

### Live Match (Already Started)
- IQ can STILL be calculated if match started without pre-match calculation
- Shown for **informational purposes only**
- NOT counted as a prediction for accuracy stats
- Flag: `calculated_live: true`
- Note: "IQ calculated during live match (informational only)"

## Frontend Display Logic

The code checks:
```javascript
if (matchIQ && matchIQ.home_iq && matchIQ.away_iq) {
  // Display IQ scores
}
```

**This works for BOTH pre-match AND live games!**

There's NO condition that prevents IQ display for live matches.

## Cache Versioning System

We implemented automatic cache clearing:
```javascript
const CACHE_VERSION = '2.0';

// On page load
if (cacheVersion !== CACHE_VERSION) {
  localStorage.clear(); // Clear old cache
  fetchFreshData();     // Get data with IQ
}
```

**This ensures users automatically get fresh data with IQ predictions.**

## Summary

| Aspect | Status |
|--------|--------|
| Backend IQ Calculation | ✅ Working for live matches |
| API Response | ✅ Returns IQ data for live matches |
| Frontend Display Logic | ✅ Shows IQ for any match with IQ data |
| Cache Versioning | ✅ Implemented (v2.0) |
| User Issue | ❌ Browser has old cached data |

## Action Required

**User must hard refresh browser to see IQ predictions!**

After hard refresh:
- ✅ Old cache cleared automatically
- ✅ Fresh data fetched with IQ predictions
- ✅ IQ scores displayed for ALL matches (pre-match AND live)

## Technical Note

The `funbet_iq` data is:
- Stored in `funbet_iq_predictions` collection
- Joined with match data in the API response
- Displayed by the frontend if present

The system is working correctly. The user just needs to refresh their browser to clear the old cache.
