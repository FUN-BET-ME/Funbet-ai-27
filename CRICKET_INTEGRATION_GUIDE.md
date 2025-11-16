# CricketData.org Integration Guide

## Current Status
✅ **Code Ready** - Integration module complete
⏳ **Waiting** - Paid plan upgrade ($5.99/month, 2000 calls/day)

---

## Step-by-Step Setup

### 1. Upgrade CricketData.org Account

**Go to:** https://cricketdata.org

**Current Plan:** Free (100 hits/day) - EXHAUSTED
**Upgrade to:** $5.99/month (2000 hits/day)

**Steps:**
1. Login to your CricketData.org account
2. Go to "Pricing" or "Upgrade" section
3. Select **$5.99/month plan** (2000 hits/day)
4. Complete payment
5. Your API key will be upgraded automatically

**API Key:** `46bb13cd-265d-45b3-ab5e-1d111030cd6d`
(This key should work after upgrade, or you'll get a new one)

---

### 2. Update API Key (if changed)

If you receive a NEW API key after upgrade:

```bash
# Edit .env file
nano /app/backend/.env

# Update this line:
CRICKET_API_KEY="<your-new-api-key-here>"

# Save and exit (Ctrl+X, Y, Enter)
```

---

### 3. Restart Backend

```bash
sudo supervisorctl restart backend
```

Wait 3-5 seconds for backend to start.

---

### 4. Test Cricket API

```bash
cd /app/backend && python test_cricket_api.py
```

**Expected Output:**
- ✅ Total matches fetched: X
- ✅ Match details with scores
- ✅ Australia vs India match found (if currently playing/recent)

---

### 5. Test Backend Endpoints

```bash
# Test live cricket matches
curl "https://funbet-hoops.preview.emergentagent.com/api/cricket/live" | jq '.'

# Test recent cricket results
curl "https://funbet-hoops.preview.emergentagent.com/api/cricket/recent" | jq '.'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "home_team": "India",
      "away_team": "Australia",
      "sport_title": "Cricket T20",
      "scores": [
        {"name": "India", "score": "167/8"},
        {"name": "Australia", "score": "119/10"}
      ],
      "match_status": "India won by 48 runs",
      "completed": true
    }
  ],
  "count": 1
}
```

---

## What Cricket Endpoints Provide

### `/api/cricket/live`
Returns:
- 🔴 **Live matches** (currently in progress)
- ⏱️ **Recent matches** (from last few hours)
- Cached for 1 minute

### `/api/cricket/recent`
Returns:
- ✅ **Completed matches only**
- 📊 Final scores and results
- Cached for 5 minutes

---

## Integration with Frontend

Cricket data will automatically appear in:

1. **"LIVE Now" section** (if Cricket filter selected)
   - Source: `/api/cricket/live`
   - Shows live cricket matches with real-time scores

2. **"Recent Results (48h)" section** (if Cricket filter selected)
   - Source: `/api/cricket/recent`
   - Shows completed cricket matches with final scores

---

## API Usage & Limits

**Plan:** $5.99/month
**Calls:** 2000/day
**Reset:** Daily at midnight UTC

**Estimated Usage:**
- Frontend refresh every 1-5 minutes
- ~300-500 calls/day typical usage
- 2000 limit = comfortable buffer

**Monitor Usage:**
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log | grep CricketData`
- API returns usage info: `hitsToday`, `hitsLimit`

---

## CricketData.org API Coverage

**What's Included:**
- ✅ International matches (T20, ODI, Test)
- ✅ IPL (Indian Premier League)
- ✅ Big Bash League
- ✅ Pakistan Super League
- ✅ Other major cricket leagues
- ✅ Live scores and ball-by-ball updates
- ✅ Match results and scorecards

**What's NOT Included:**
- ❌ Betting odds (use Digitain/the-odds-api for this)

---

## Troubleshooting

### Issue: "Blocking since hits today exceeded hits limit"
**Solution:** 
- Wait for daily reset (midnight UTC)
- OR upgrade to higher plan if needed

### Issue: API returns empty data
**Possible Reasons:**
- No cricket matches currently live/recent
- Check if matches are scheduled: https://www.espncricinfo.com
- API might have delay (usually <1 minute)

### Issue: Australia vs India not showing
**Check:**
1. Is match currently live? (CricketData shows live + recent)
2. If match finished >24h ago, it might not appear
3. Test with: `python test_cricket_api.py` to see all available matches

---

## Files Created

- ✅ `/app/backend/cricketdata_api.py` - Integration module
- ✅ `/app/backend/test_cricket_api.py` - Test script
- ✅ `/app/backend/server.py` - Updated with cricket endpoints
- ✅ `/app/CRICKET_INTEGRATION_GUIDE.md` - This guide

---

## Next Steps After Upgrade

1. ✅ Upgrade CricketData.org to $5.99/month plan
2. ✅ Run test script: `python test_cricket_api.py`
3. ✅ Verify endpoints: `/api/cricket/live` and `/api/cricket/recent`
4. ✅ Test frontend: Go to "Recent Results" → Cricket filter
5. ✅ See live cricket scores! 🏏

---

## Cost Summary

**Monthly Costs:**
- CricketData.org: $5.99/month (2000 calls/day)
- Digitain: Waiting for production credentials
- the-odds-api.com: Already covered

**Total: ~$6/month for cricket scores**

---

## Questions?

If cricket data isn't showing after upgrade:
1. Check API key is correct in `.env`
2. Restart backend
3. Check backend logs for errors
4. Run test script to verify API is working
5. Check if any cricket matches are currently scheduled
