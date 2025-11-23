# Live Games IQ Missing - Root Cause Fixed

## Issue
User reported: "It loads with IQ and something removes it - I see it happening"

This was a critical clue that revealed the real problem.

## Root Cause Analysis

### What Was Happening:
1. ✅ User opens page → Data loaded from `/api/odds/all-cached` (includes IQ)
2. ✅ IQ scores displayed correctly
3. ❌ User switches to "Live Now" filter OR page auto-refreshes
4. ❌ Frontend calls `/api/odds/inplay` endpoint
5. ❌ **This endpoint was NOT including IQ data!**
6. ❌ Frontend replaces allOdds state with data from `/inplay` (without IQ)
7. ❌ IQ scores disappear

### The Bug:
The `/api/odds/inplay` endpoint in `server.py` was:
- ✅ Fetching matches from `odds_cache` collection
- ✅ Adding live scores
- ❌ **NOT joining IQ data from `funbet_iq_predictions` collection**

Meanwhile, `/api/odds/all-cached` WAS correctly joining IQ data.

## The Fix

### Backend Changes
**File**: `/app/backend/server.py`
**Endpoint**: `/api/odds/inplay` (line 654)

**Added IQ data join logic** (same as all-cached endpoint):

```python
# CRITICAL: Merge IQ predictions for all matches
if matches:
    iq_count = 0
    for match in matches:
        # Fetch IQ prediction for this match
        iq_pred = await db_instance.db.funbet_iq_predictions.find_one(
            {'match_id': match['id']},
            {'_id': 0}
        )
        if iq_pred:
            # Add IQ data directly to match object
            match['funbet_iq'] = {
                'home_iq': iq_pred.get('home_iq'),
                'away_iq': iq_pred.get('away_iq'),
                'draw_iq': iq_pred.get('draw_iq'),
                'confidence': iq_pred.get('confidence'),
                'verdict': iq_pred.get('verdict'),
                'home_components': iq_pred.get('home_components'),
                'away_components': iq_pred.get('away_components'),
                'prediction_correct': iq_pred.get('prediction_correct'),
                'predicted_winner': iq_pred.get('predicted_winner'),
                'actual_winner': iq_pred.get('actual_winner'),
                'verified_at': iq_pred.get('verified_at')
            }
            iq_count += 1
    
    logger.info(f"✅ inplay: {len(matches)} matches, {iq_count} with IQ predictions")
```

## Verification

### Before Fix:
```bash
curl "http://localhost:8001/api/odds/inplay"
# Result: NO funbet_iq field in matches ❌
```

### After Fix:
```bash
curl "http://localhost:8001/api/odds/inplay"
# Result:
# 1. Arsenal vs Tottenham: home_iq=56.1, away_iq=32.2, draw_iq=21.7 ✅
# 2. FC St. Pauli vs Union Berlin: home_iq=44.0 ✅
```

## Why This Was Missed

The application has **multiple API endpoints** for fetching matches:
1. `/api/odds/all-cached` - Main endpoint (had IQ join ✅)
2. `/api/odds/inplay` - Live matches (missing IQ join ❌) **<-- THIS WAS THE BUG**
3. `/api/odds/historical/recent` - Recent results (needs checking)

When the frontend switches filters or auto-refreshes, it uses different endpoints. The `/inplay` endpoint was missing the IQ join logic.

## Testing Done

✅ Backend restarted
✅ `/api/odds/inplay` now returns IQ data
✅ Arsenal vs Tottenham showing IQ: 56.1 / 32.2 / 21.7
✅ Frontend restarted

## Expected Behavior Now

**Scenario 1: User opens page**
- Loads matches with IQ ✅
- IQ scores displayed ✅

**Scenario 2: User switches to "Live Now" filter**
- Calls `/api/odds/inplay` ✅
- Endpoint returns matches WITH IQ data ✅
- IQ scores remain displayed ✅

**Scenario 3: Auto-refresh (every 5 minutes)**
- Refreshes data ✅
- IQ data included ✅
- IQ scores persist ✅

## Additional Checks Needed

Should verify these endpoints also include IQ join:
- [ ] `/api/odds/historical/recent` - for "Recent Results" filter
- [ ] Any other match-fetching endpoints

## Conclusion

The issue was NOT browser cache. It was a **missing IQ join in the `/api/odds/inplay` endpoint**.

Now all live matches will show IQ predictions consistently, and they won't disappear when the user switches filters or the page auto-refreshes.

**User should now see IQ scores persist for all live matches! 🎯**
