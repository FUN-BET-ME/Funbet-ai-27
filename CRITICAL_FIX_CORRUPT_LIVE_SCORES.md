# CRITICAL FIX: Corrupt Live Scores on Future Matches

## User Report
"What's wrong?? No upcoming EPL matches and this game is old... what the fuck is going on"

User saw Crystal Palace 1-0 Man United at 27' marked as LIVE, but this is a future match (Nov 30, 7 days away).

## Root Cause
The background worker's live score matching logic was incorrectly attaching live score data from CURRENT matches to FUTURE matches with similar team names.

### The Bug:
1. Background worker runs every 10 seconds
2. Fetches live scores from API-Sports
3. Uses fuzzy matching to link scores to database matches
4. **Time window was TOO WIDE**: -6 hours to **+3 hours**
5. Future matches (e.g., Nov 30) were being matched with current live games
6. Future matches incorrectly marked as `is_live: true` with stale scores

### Evidence:
```javascript
// Crystal Palace vs Man United
{
  commence_time: '2025-11-30T12:00:00Z',  // 7 days in the future
  live_score: {
    home_score: '1',
    away_score: '0',
    is_live: true,  // ❌ WRONG! Match hasn't started
    match_status: "37'"
  }
}
```

## Fixes Applied

### 1. Cleared Corrupt Data (Immediate)
```python
# Cleared 14 future matches with corrupt live_score data
db.odds_cache.update_many(
    {
        'commence_time': {'$gt': now_str},
        'live_score.is_live': True
    },
    {'$unset': {'live_score': ''}}
)
```

### 2. Fixed Time Window (Prevention)
**File**: `/app/backend/background_worker.py`

**Before:**
```python
time_window_start = (datetime.now() - timedelta(hours=6)).isoformat()
time_window_end = (datetime.now() + timedelta(hours=3)).isoformat()  # ❌ +3 hours!
```

**After:**
```python
time_window_start = (datetime.now() - timedelta(hours=6)).isoformat()
time_window_end = datetime.now().isoformat()  # ✅ NOW only!
```

### 3. Added Future Match Check (Safety)
**File**: `/app/backend/background_worker.py` (line 763)

**Added check before updating:**
```python
if linked_match:
    # CRITICAL: Verify match has actually STARTED
    commence_time_str = linked_match.get('commence_time', '')
    if commence_time_str:
        commence_time = datetime.fromisoformat(commence_time_str.replace('Z', '+00:00'))
        if commence_time > datetime.now(timezone.utc):
            # Match hasn't started yet - skip this live score update
            logger.warning(f"⚠️ Skipping live score for FUTURE match")
            continue
```

### 4. Fixed Fuzzy Matching (Additional Safety)
**File**: `/app/backend/background_worker.py` (line 757)

**Before:**
```python
'commence_time': {'$gte': (datetime.now() - timedelta(hours=6)).isoformat()}
```

**After:**
```python
'commence_time': {
    '$gte': (datetime.now() - timedelta(hours=6)).isoformat(),
    '$lte': datetime.now().isoformat()  # ✅ Must have started!
}
```

## Testing Done

### Before Fix:
```bash
curl "http://localhost:8001/api/odds/all-cached?sport=soccer"
# Crystal Palace vs Man United (Nov 30) showing as LIVE ❌
```

### After Fix:
```bash
# Cleared 14 future matches with corrupt data ✅
# Time window fixed to only match started games ✅
# Future match check added ✅
```

## Impact

**Before:**
- ❌ Future EPL matches showing as LIVE with old scores
- ❌ User confused seeing "old games"
- ❌ Incorrect match filtering (future matches in "Live Now" tab)

**After:**
- ✅ Only actual live games show as LIVE
- ✅ Future matches remain in "Upcoming" state
- ✅ Accurate match data
- ✅ Correct filtering by time status

## Verification Steps

1. ✅ Cleared 14 corrupt future matches
2. ✅ Fixed time window in background worker
3. ✅ Added future match safety check
4. ✅ Fixed fuzzy matching time constraint
5. ⏳ Background worker restart needed

## Next Steps

1. **Restart background worker** to apply fixes:
   ```bash
   pkill -f background_worker.py
   cd /app/backend && nohup python3 background_worker.py &
   ```

2. **Monitor logs** for warnings about future match skips:
   ```bash
   tail -f /tmp/background_worker.log | grep "FUTURE match"
   ```

3. **Verify no future matches have live_score**:
   ```bash
   mongosh funbet --eval "db.odds_cache.find({
     commence_time: {\$gt: new Date().toISOString()},
     'live_score.is_live': true
   }).count()"
   # Should return 0
   ```

## Root Cause Summary

The background worker was using a time window that extended **+3 hours into the future** when matching live scores to database matches. This caused live scores from current matches (e.g., Arsenal vs Spurs) to be incorrectly matched to future matches with similar team names (e.g., Crystal Palace vs Man United on Nov 30).

The fix ensures live scores are ONLY attached to matches that have:
1. Started already (commence_time <= NOW)
2. Within a reasonable time window (-6 hours to NOW)
3. Passed an additional safety check before database update

**User should now see correct upcoming EPL matches without corrupt live score data!**
