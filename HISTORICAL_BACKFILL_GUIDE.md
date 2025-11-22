# Historical Backfill System for FunBet IQ

## Overview

Automated system that backfills FunBet IQ predictions for completed matches using historical odds data from The Odds API.

## How It Works

### 1. **Automatic Backfill Job**
- **Schedule**: Runs twice daily at **6:00 AM UTC** and **6:00 PM UTC**
- **Purpose**: Ensures all recently completed matches have IQ predictions
- **Coverage**: Matches from last 7 days

### 2. **Process Flow**

```
1. Find completed matches without IQ predictions
   ↓
2. Fetch historical odds (1 hour before match start)
   ↓
3. Calculate FunBet IQ using historical betting data
   ↓
4. Save prediction to database
   ↓
5. Auto-verify prediction against actual result
   ↓
6. Display on frontend with ✅/❌ stamp
```

### 3. **What Gets Backfilled**

**Criteria:**
- Match must be marked as `completed: true`
- Match started within last 7 days
- No existing IQ prediction in database
- Match has valid `sport_key` for historical API

**Limits:**
- Maximum 50 matches per run (to control API usage)
- Processes all sports (football, cricket, basketball, etc.)

### 4. **API Usage**

**The Odds API - Historical Endpoint:**
```
GET /v4/historical/sports/{sport_key}/odds
Parameters:
  - apiKey: Your API key
  - regions: uk,eu,us,au
  - markets: h2h
  - date: YYYY-MM-DDTHH:MM:SSZ (1 hour before match)
```

**Response:**
- Returns betting odds from specified timestamp
- Includes all bookmakers available at that time
- Used to calculate retrospective FunBet IQ

### 5. **Verification Process**

After calculating IQ, the system automatically:

1. **Extracts actual scores** from match data
2. **Determines actual winner** (home/away/draw)
3. **Compares with predicted winner** (based on IQ values)
4. **Saves verification result**:
   - `prediction_correct`: true/false
   - `predicted_winner`: 'home'/'away'/'draw'
   - `actual_winner`: 'home'/'away'/'draw'
   - `verified_at`: timestamp

### 6. **Frontend Display**

**Recent Results Tab shows:**
- ✅ Final scores (e.g., "161/10 - 162/6")
- ✅ FunBet IQ values (Home IQ, Away IQ, Draw IQ)
- ✅ Confidence level (High/Medium/Low)
- ✅ Prediction verification stamp (✅ CORRECT / ❌ INCORRECT)

## Manual Backfill

### Run for specific match:

```python
cd /app/backend && python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
import sys

ROOT_DIR = Path('/app/backend')
load_dotenv(ROOT_DIR / '.env')
sys.path.insert(0, str(ROOT_DIR))

from background_worker import OddsWorker

async def manual_backfill():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    worker = OddsWorker()
    worker.db = db
    
    await worker.backfill_historical_iq_job()

asyncio.run(manual_backfill())
EOF
```

## Monitoring

### Check backfill logs:

```bash
tail -f /var/log/supervisor/backend.err.log | grep -E "📜|backfill|historical"
```

### View next scheduled run:

```bash
# Shows next backfill execution time
grep "backfill_historical_iq" /var/log/supervisor/backend.err.log | tail -5
```

### Check backfill status:

```python
cd /app/backend && python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path('/app/backend')
load_dotenv(ROOT_DIR / '.env')

async def check_status():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Stats
    completed = await db.odds_cache.count_documents({'completed': True})
    with_iq = await db.funbet_iq_predictions.count_documents({})
    verified = await db.funbet_iq_predictions.count_documents({'prediction_correct': {'$ne': None}})
    
    print(f"Total completed matches: {completed}")
    print(f"Total IQ predictions: {with_iq}")
    print(f"Verified predictions: {verified}")
    print(f"Coverage: {(with_iq/completed*100):.1f}%")

asyncio.run(check_status())
EOF
```

## API Credit Usage

**Per backfill run:**
- 1 API call per unique match being backfilled
- Maximum 50 calls per run (limit set to control costs)
- 2 runs per day = ~100 calls/day maximum

**Cost optimization:**
- Only processes matches from last 7 days
- Skips matches that already have IQ
- Batches requests efficiently

## Troubleshooting

### Issue: No matches being backfilled

**Check:**
1. Are there completed matches without IQ in last 7 days?
2. Is the job scheduled? (Check scheduler logs)
3. Are API credits available?

```bash
# Check for matches needing backfill
curl -s "http://localhost:8001/api/odds/all-cached?time_filter=recent&limit=50" | \
  python3 -c "import sys, json; matches=[m for m in json.load(sys.stdin)['matches'] if m.get('completed') and not m.get('funbet_iq')]; print(f'Matches without IQ: {len(matches)}')"
```

### Issue: Historical odds not found

**Reasons:**
1. Match too old (The Odds API has data from June 2020 onwards)
2. Sport/league not covered by The Odds API
3. Match had no betting markets

**Solution:** Only matches with betting odds can be backfilled.

### Issue: Verification showing as None

**Reasons:**
1. Match doesn't have final scores yet
2. Scores in wrong format

**Solution:** Check `scores` array exists with format: `[{"name": "Team", "score": "2"}]`

## Configuration

### Change schedule:

Edit `/app/backend/background_worker.py`:

```python
# Current: 6 AM & 6 PM UTC
trigger=CronTrigger(hour='6,18', minute=0, timezone='UTC')

# Change to: Every 6 hours
trigger=IntervalTrigger(hours=6)

# Change to: Once daily at midnight
trigger=CronTrigger(hour=0, minute=0, timezone='UTC')
```

### Change match limit:

```python
# In backfill_historical_iq_job method
'$limit': 50  # Change this number (default: 50)
```

### Change lookback period:

```python
# In backfill_historical_iq_job method
seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)  # Change days
```

## Benefits

✅ **Complete historical data** - All matches have predictions
✅ **Automatic verification** - No manual intervention needed
✅ **Track record accuracy** - Real performance metrics
✅ **User trust** - See actual prediction success rates
✅ **API efficient** - Controlled usage with limits
✅ **Sport agnostic** - Works for all sports with odds

## Limitations

❌ Cannot backfill matches without betting odds
❌ Limited to matches in The Odds API coverage
❌ Historical data only from June 2020 onwards
❌ API credit usage per backfilled match
❌ 7-day lookback window (configurable)

## Summary

The historical backfill system ensures that **all recently completed matches appear on the frontend with complete data**:
- Final scores ✅
- FunBet IQ predictions ✅
- Prediction verification stamps ✅

This provides users with a complete view of the system's prediction accuracy and builds trust in the FunBet IQ algorithm.
