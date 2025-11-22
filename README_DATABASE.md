# Database Quick Reference

## ⚠️ CRITICAL: Database Name is `funbet` NOT `sportsiq`

### Quick Facts
- **Database**: `funbet`
- **Connection**: `mongodb://localhost:27017`
- **Config**: `/app/backend/.env`

### Usage in Code
```python
from config import settings
client = MongoClient(settings.mongo_url)
db = client[settings.db_name]  # Uses "funbet"
```

### Current Data
- **893** matches
- **734** predictions
- **286** verified (73.4% accuracy)

**See `/app/CRITICAL_DATABASE_INFO.md` for complete details**
