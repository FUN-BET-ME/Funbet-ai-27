# FunBet IQ - Quick Reference Guide
**For Next Agent / Developer**

---

## 🔥 Most Important Things to Know

### 1. Prediction Integrity (CRITICAL!)
```python
# Line 537 in funbet_iq_engine.py
# NEVER change this filter - predictions MUST be pre-match only
matches_cursor = db.odds_cache.find(
    {'commence_time': {'$gt': now_str}}  # Future matches ONLY!
)
```

### 2. FunBet IQ Formula
```
20% Odds Analysis
20% Volume Analysis
20% Odds Movement
20% Team Stats
10% Momentum (home win +3, draw +2, away win +5, unbeaten +2, draw +1)
10% Head-to-Head
```

### 3. Background Jobs
- **Every 10 min**: Calculate IQ (pre-match only)
- **Every 12 hours**: Fetch historical data (team stats, H2H)
- **Twice daily**: Backfill historical IQ for completed matches

---

## 🛠️ Common Tasks

### Recalculate All Predictions
```bash
cd /app/backend
python recalculate_all_funbet_iq.py
```

### Populate Historical Data
```bash
cd /app/backend
python populate_historical_data.py
```

### Verify Prediction Integrity
```bash
cd /app/backend
python test_prediction_integrity_v2.py
```

### Check Logs
```bash
# All background worker logs
tail -f /var/log/supervisor/backend.err.log

# Just IQ calculations
tail -f /var/log/supervisor/backend.err.log | grep "🧠"

# Just historical data
tail -f /var/log/supervisor/backend.err.log | grep "📊"
```

### Restart Backend
```bash
sudo supervisorctl restart backend
```

---

## 📂 Key Files

### Core Algorithm
- `/app/backend/funbet_iq_engine.py` - Main IQ calculation (V4)
- Line 537: **CRITICAL** pre-match filter
- Line 615: Main `calculate_funbet_iq()` function

### Background Worker
- `/app/backend/background_worker.py`
- Line 375: IQ calculation job
- Line 1209: Historical data job
- Line 993: Historical backfill job

### Historical Data
- `/app/backend/historical_data_builder.py` - Data fetching
- `/app/backend/populate_historical_data.py` - Manual script

### Testing
- `/app/backend/test_prediction_integrity_v2.py` - Integrity tests
- `/app/backend/recalculate_all_funbet_iq.py` - Recalculation

### Documentation
- `/app/backend/CHANGELOG_V4.md` - **READ THIS FIRST!**
- `/app/FUNBET_IQ_V4_UPGRADE_REPORT.md` - Algorithm details
- `/app/PREDICTION_INTEGRITY_AUDIT_REPORT.md` - Integrity report
- `/app/HISTORICAL_DATA_INTEGRATION.md` - Data fetching details

---

## 🗄️ Database Collections

### `odds_cache`
- All matches with odds and bookmakers
- Updated every 5 minutes
- Contains live scores when available

### `funbet_iq_predictions`
- All IQ predictions (pre-match only!)
- Schema: home_iq, away_iq, home_components, away_components
- Never updated after creation (immutable)

### `team_historical_stats`
- Team performance data
- Auto-populated every 12 hours
- Used by: Team Stats IQ (20%), Momentum IQ (10%)

### `head_to_head_stats`
- Historical matchup records
- Auto-populated every 12 hours
- Used by: H2H IQ (10%)

---

## 🔍 Quick Debugging

### Issue: Predictions showing 50.0 for all components
**Check**: Historical data available?
```bash
mongosh
use test_database
db.team_historical_stats.countDocuments()
```
**Solution**: Run `python populate_historical_data.py`

### Issue: Predictions being calculated for live matches
**Check**: Pre-match filter in place?
```bash
grep "commence_time.*gt.*now" /app/backend/funbet_iq_engine.py
```
**Solution**: Should show line 537 with `{'commence_time': {'$gt': now_str}}`

### Issue: Background jobs not running
**Check**: Supervisor logs
```bash
tail -n 100 /var/log/supervisor/backend.err.log
```
**Solution**: Restart backend `sudo supervisorctl restart backend`

### Issue: Historical data not collecting
**Check**: API keys configured?
```bash
grep API_FOOTBALL_KEY /app/backend/.env
grep ODDS_API_KEY /app/backend/.env
```
**Solution**: Add keys to `.env` file

---

## ⚡ Quick MongoDB Queries

### View recent predictions
```javascript
db.funbet_iq_predictions.find({}).sort({calculated_at: -1}).limit(5)
```

### Check component breakdown
```javascript
db.funbet_iq_predictions.findOne({}, {
  home_team: 1,
  away_team: 1,
  home_iq: 1,
  away_iq: 1,
  home_components: 1
})
```

### Count by sport
```javascript
db.odds_cache.aggregate([
  {$group: {_id: "$sport_key", count: {$sum: 1}}},
  {$sort: {count: -1}}
])
```

### Find matches without historical data
```javascript
db.odds_cache.find({
  commence_time: {$gt: new Date().toISOString()}
}).limit(10).forEach(match => {
  var stats = db.team_historical_stats.findOne({
    team_name: new RegExp(match.home_team, 'i')
  });
  print(match.home_team + ": " + (stats ? "✓" : "✗"));
});
```

---

## 🎯 Component Scores Explained

### Odds IQ (20%)
- Base: Market implied probability × 100
- Bonus: +5 for best odds, +5 for low variance
- Range: 0-100

### Volume IQ (20%)
- Bookmaker count: 40% (8+ = 90, 4-7 = 60-80, 1-3 = 40-60)
- Consensus: 30% (low variance = high score)
- Probability: 30%
- Range: 0-100

### Movement IQ (20%)
- Based on odds spread
- Tight spread (<5%): +10 bonus
- Wide spread (>15%): -5 penalty
- Range: 0-100

### Team Stats IQ (20%)
- Win rate: 40%
- Goal difference: 30%
- Home/away balance: 15%
- Recent form: 15%
- Range: 0-100

### Momentum IQ (10%)
- Last 10 games scoring:
  - Home win: 3 + 2 (unbeaten) = 5
  - Draw: 2 + 2 (unbeaten) + 1 (draw) = 5
  - Away win: 5 + 2 (unbeaten) = 7
  - Loss: 0 (resets unbeaten)
- Max: 70 points → normalized to 0-100

### H2H IQ (10%)
- Win percentage (draws split 50/50)
- Recent form bonus (last 5 H2H)
- Range: 0-100
- Default: 50.0 if no H2H data

---

## 🚨 Critical Rules

### NEVER
❌ Change `commence_time > now` filter  
❌ Use `update_one(upsert=True)` for predictions  
❌ Calculate IQ for matches that started  
❌ Modify prediction weights without recalculating  

### ALWAYS
✅ Verify integrity after changes  
✅ Run recalculation after weight changes  
✅ Check logs after deployment  
✅ Keep API keys secure  

---

## 📞 Emergency Commands

### Backend crashed?
```bash
sudo supervisorctl status backend
sudo supervisorctl restart backend
tail -f /var/log/supervisor/backend.err.log
```

### Database connection issue?
```bash
echo $MONGO_URL
mongosh $MONGO_URL
```

### Need to clear all predictions?
```bash
mongosh
use test_database
db.funbet_iq_predictions.deleteMany({})
```
Then run: `python recalculate_all_funbet_iq.py`

---

## 📈 Monitoring

### Check system health
```bash
# Prediction count
mongosh --eval "db.funbet_iq_predictions.countDocuments()" test_database

# Historical data count
mongosh --eval "db.team_historical_stats.countDocuments()" test_database

# Recent predictions
mongosh --eval "db.funbet_iq_predictions.find({}).sort({calculated_at:-1}).limit(1)" test_database
```

### Check API usage
```bash
# Grep logs for API calls
grep "API calls today" /var/log/supervisor/backend.err.log | tail -1

# Check remaining quota
grep "Remaining:" /var/log/supervisor/backend.err.log | tail -1
```

---

## 🔗 Quick Links

**Read First**: `/app/backend/CHANGELOG_V4.md`

**Algorithm Details**: `/app/FUNBET_IQ_V4_UPGRADE_REPORT.md`

**Integrity Report**: `/app/PREDICTION_INTEGRITY_AUDIT_REPORT.md`

**Historical Data**: `/app/HISTORICAL_DATA_INTEGRATION.md`

**This File**: `/app/backend/QUICK_REFERENCE.md`

---

**Last Updated**: November 22, 2025  
**Version**: 4.0  
**Status**: Production Ready ✅
