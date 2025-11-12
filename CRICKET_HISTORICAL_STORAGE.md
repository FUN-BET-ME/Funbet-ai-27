# Cricket Historical Storage System

## Problem Solved
✅ **Cricket match history is now SAVED to MongoDB**
✅ **Matches won't disappear after 24-48 hours**
✅ **Building up historical database over time**

---

## How It Works

### 1. Data Collection
Every time someone views cricket matches:
- API fetches from CricketData.org
- Matches are **automatically saved to MongoDB**
- Existing matches are **updated** with latest scores

### 2. Data Storage
**MongoDB Collection**: `cricket_matches`

**Fields Stored:**
- `match_id` - Unique identifier
- `home_team` / `away_team` - Team names
- `sport_title` - Cricket T20/ODI/Test
- `commence_time` - Match start time
- `completed` - True/False
- `scores` - Array of team scores
- `match_status` - "India won by 48 runs", etc.
- `venue` - Stadium name
- `last_updated` - When we last updated this match

### 3. Data Retrieval
**Endpoint**: `/api/cricket/recent?days_back=7`

**Sources (Hybrid Approach):**
1. **CricketData.org API** - Last 24-48 hours (live data)
2. **MongoDB Database** - Last 7 days (historical)
3. **Merged & Deduplicated** - Best of both

**Response:**
```json
{
  "status": "success",
  "count": 15,
  "sources": {
    "api": 3,
    "database": 15,
    "total": 15
  },
  "data": [...]
}
```

---

## What You Get

### Before (OLD System):
❌ Only last 24-48 hours from API
❌ Matches disappear after 2 days
❌ No historical tracking
❌ Lost bet history

### After (NEW System):
✅ Last 7 days (configurable) from MongoDB
✅ Matches saved permanently
✅ Historical tracking enabled
✅ **Bet history preserved!**

---

## How Long Is History Kept?

**Current Setting**: 7 days (default)
**Configurable**: Can extend to 30/60/90 days

**To change default:**
```python
# In server.py, line:
async def get_cricket_recent(days_back: int = 7):
# Change 7 to whatever you want (e.g., 30)
```

**Frontend can also request:**
```
/api/cricket/recent?days_back=30
```

---

## Automatic Updates

**When Matches Are Saved:**
1. When `/api/cricket/live` is called (every 1 minute by frontend)
2. When `/api/cricket/recent` is called (every 5 minutes)
3. Matches are **upserted** (insert new, update existing)

**Update Strategy:**
- New match → Insert to database
- Existing match → Update with latest score/status
- Completed match → Keep in database as historical record

---

## Database Management

### Check Stored Matches
```bash
cd /app/backend && python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    count = await db['cricket_matches'].count_documents({})
    print(f'Total matches: {count}')
    client.close()

asyncio.run(check())
"
```

### Clear Old Matches (Optional)
If you want to clean up matches older than X days:
```python
# Add this endpoint to server.py if needed
@api_router.delete("/cricket/cleanup")
async def cleanup_old_cricket(days_to_keep: int = 30):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
    result = await cricket_matches_collection.delete_many({
        'commence_time': {'$lt': cutoff.isoformat()}
    })
    return {"deleted": result.deleted_count}
```

---

## Current Status

✅ **3 matches currently in database:**
1. Australia vs India (Nov 6)
2. New Zealand vs West Indies (Nov 6)
3. New Zealand vs West Indies (Nov 5)

✅ **System is now collecting ALL future matches**
✅ **History will build up over time**
✅ **Australia vs India will stay in database!**

---

## What Happens Now?

### Day 1 (Today):
- 3 matches stored
- Database starts building

### Day 2 (Tomorrow):
- New matches added
- Old matches still preserved
- Database: ~6-10 matches

### Week 1:
- Database: ~20-30 matches
- Full 7-day history available

### Month 1:
- Database: ~100+ matches
- Complete cricket history for the month

---

## Benefits

1. **Reliable History** - Never lose match data
2. **Faster Loading** - MongoDB is faster than API for old data
3. **Offline Backup** - Data persists even if CricketData.org is down
4. **Analytics Ready** - Can build stats, trends, reports
5. **User Trust** - Complete bet history always available

---

## Files Modified

- ✅ `/app/backend/server.py` - Added storage functions
- ✅ MongoDB collection `cricket_matches` created
- ✅ Endpoints updated to save + retrieve

---

## Cost

**No additional cost!**
- MongoDB storage: Already included
- CricketData.org: Same $5.99/month
- Database space: Minimal (~1KB per match = 365 matches = 365KB/year)

---

**🏏 Cricket history is now SAVED and SECURE!**
