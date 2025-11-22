# ⚠️ CRITICAL: DATABASE CONFIGURATION

## READ THIS FIRST - FOR ALL AGENTS

---

## **CORRECT DATABASE NAME: `funbet`** ❗

**DO NOT USE:** `sportsiq` (this is WRONG)
**ALWAYS USE:** `funbet` (this is CORRECT)

---

## 🛑 CRITICAL WARNING: NO DATA DELETION

**NEVER DELETE ANY DATA FROM THE DATABASE - EVER!**

This is a **PERMANENT RULE** - NO EXCEPTIONS:

### ❌ ABSOLUTELY FORBIDDEN:
```python
# DO NOT DO ANY OF THESE:
db.odds_cache.delete_many({})  # ❌ NO
db.funbet_iq_predictions.drop()  # ❌ NO
db.collection.delete_one({...})  # ❌ NO
db.collection.remove({...})  # ❌ NO
client.drop_database('funbet')  # ❌ NO
```

### ✅ ALLOWED OPERATIONS:
```python
# ONLY THESE ARE OK:
db.collection.insert_one({...})  # ✅ YES - Add new data
db.collection.update_one({...}, {'$set': {...}})  # ✅ YES - Update existing
db.collection.find({...})  # ✅ YES - Read data
```

### Why This Rule Exists:
1. **Historical Data is Irreplaceable**: Track record integrity depends on it
2. **User Trust**: Deleting verified predictions destroys credibility
3. **Prediction Proof**: We need complete history to prove accuracy
4. **System Analysis**: Historical data needed for improvements
5. **Legal/Compliance**: May be required for auditing

### If Data Cleanup Needed:
1. **STOP** - Don't delete anything
2. **ASK USER FIRST** - Get explicit permission
3. **DOCUMENT REASON** - Why cleanup is needed
4. **BACKUP FIRST** - If user approves, backup before any action
5. **USER CONFIRMS** - Get final confirmation

**When in doubt: DON'T DELETE - ASK USER!**

---

## Configuration

### Environment Variables
Location: `/app/backend/.env`

```bash
MONGO_URL="mongodb://localhost:27017"
DB_NAME="funbet"  # ← THIS IS THE CORRECT DATABASE NAME
```

### How Code Accesses Database

**Backend (Python)**:
```python
# ✅ CORRECT - Uses settings from .env
from database import db_instance
db = db_instance.db  # This uses DB_NAME from .env = "funbet"

# ✅ CORRECT - For scripts
from config import settings
client = MongoClient(settings.mongo_url)
db = client[settings.db_name]  # Uses "funbet" from .env

# ❌ WRONG - Hardcoded database name
client = MongoClient('mongodb://localhost:27017')
db = client.sportsiq  # DO NOT DO THIS
```

---

## Database Collections

### In `funbet` database:
- `odds_cache` - All match data with odds
- `funbet_iq_predictions` - All FunBet IQ predictions
- `team_logos` - Team logo URLs
- `team_historical_stats` - Historical team statistics
- `users` - User accounts

### Current Data (as of Nov 22, 2025):
- **893 matches** in odds_cache
- **734 predictions** in funbet_iq_predictions
- **286 verified predictions** (73.4% accuracy)

---

## For Scripts and Testing

### ✅ CORRECT Way:
```python
import os
from pymongo import MongoClient

# Option 1: Use settings
from config import settings
client = MongoClient(settings.mongo_url)
db = client[settings.db_name]

# Option 2: Read from .env directly
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
DB_NAME = os.getenv('DB_NAME', 'funbet')
client = MongoClient('mongodb://localhost:27017')
db = client[DB_NAME]
```

### ❌ WRONG Way:
```python
# DO NOT HARDCODE DATABASE NAME
client = MongoClient('mongodb://localhost:27017')
db = client.sportsiq  # WRONG DATABASE
```

---

## Common Mistakes

### Mistake 1: Hardcoded "sportsiq"
```python
# ❌ WRONG
db = client.sportsiq
```

### Mistake 2: Using wrong MONGO_URL environment variable
```python
# ❌ WRONG - MONGO_URL might not be set in environment
MONGO_URL = os.getenv('MONGO_URL')
```

The MONGO_URL and DB_NAME are in `/app/backend/.env` file, not in system environment variables.

---

## Verification

To verify you're using the correct database:

```bash
cd /app/backend && python3 << 'EOF'
from config import settings
print(f"Database name: {settings.db_name}")
print(f"Mongo URL: {settings.mongo_url}")
EOF
```

Expected output:
```
Database name: funbet
Mongo URL: mongodb://localhost:27017
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **Database Name** | `funbet` |
| **Connection** | `mongodb://localhost:27017` |
| **Config File** | `/app/backend/.env` |
| **Main Collections** | odds_cache, funbet_iq_predictions |
| **Total Predictions** | 734 |
| **Verified (Completed)** | 286 (73.4% accuracy) |

---

## If You See "sportsiq" Database

**STOP!** You're using the wrong database. 

The `sportsiq` database is EMPTY and NOT USED.
All data is in the `funbet` database.

---

## For New Agents

**ALWAYS:**
1. Read this file first
2. Use `settings.db_name` or read from .env
3. Never hardcode "sportsiq"
4. Verify database name before running queries

**Database name is `funbet` - Remember this!**

---

Last Updated: November 22, 2025
