# 🛑 DATA PRESERVATION POLICY

## CRITICAL RULE: NEVER DELETE ANY DATA

This is a **PERMANENT, NON-NEGOTIABLE RULE** for this application.

---

## ❌ ABSOLUTELY FORBIDDEN OPERATIONS

### Database Operations - NEVER DO:
```python
# ❌ DELETE OPERATIONS - FORBIDDEN
db.collection.delete_one({...})
db.collection.delete_many({...})
db.collection.remove({...})
db.collection.drop()
client.drop_database('funbet')

# ❌ TRUNCATE/CLEAR - FORBIDDEN
db.collection.delete_many({})  # Deletes all documents
```

### File Operations - NEVER DO:
```bash
# ❌ DON'T DELETE DATABASE FILES
rm -rf /data/db/*
rm -rf mongodb data files

# ❌ DON'T CLEAR COLLECTIONS
mongo funbet --eval "db.odds_cache.remove({})"
```

---

## ✅ ALLOWED OPERATIONS

### Safe Database Operations:
```python
# ✅ INSERT - Add new data
db.collection.insert_one({...})
db.collection.insert_many([...])

# ✅ UPDATE - Modify existing data
db.collection.update_one(
    {'_id': doc_id},
    {'$set': {'field': 'new_value'}}
)

# ✅ FIND - Read data
db.collection.find({...})
db.collection.find_one({...})

# ✅ AGGREGATE - Query/analyze data
db.collection.aggregate([...])
```

---

## Why This Rule Exists

### 1. Historical Integrity
- **Track record is permanent proof** of prediction accuracy
- Deleting verified predictions = destroying credibility
- Users need to see complete, unaltered history

### 2. Prediction Transparency
- All IQ predictions are **pre-match and immutable**
- Complete history proves we don't "adjust" predictions
- Authenticity depends on never deleting results

### 3. System Analysis
- Historical data needed for:
  - Accuracy analysis by sport/league/confidence
  - Algorithm improvements
  - Performance trends
  - User behavior patterns

### 4. Legal/Compliance
- May be required for:
  - Regulatory audits
  - Dispute resolution
  - Proof of fair practices

### 5. Business Value
- Historical data = valuable asset
- Shows long-term accuracy trends
- Builds user trust over time

---

## What About Old/Irrelevant Data?

### Storage is Cheap, Data is Valuable
- MongoDB handles millions of documents easily
- Storage costs are minimal
- Historical value is HIGH

### If You Think Cleanup is Needed:
1. **STOP** - Don't proceed
2. **DOCUMENT** - Write down why cleanup seems necessary
3. **ASK USER** - Present the case to user
4. **WAIT** - Get explicit written approval
5. **BACKUP** - If approved, full backup first
6. **VERIFY** - User confirms backup is good
7. **PROCEED** - Only then, with user watching

---

## Examples of What NOT to Delete

### ❌ Don't Delete:
- **Old predictions** - "These are from last month, clean up?"
- **Incorrect predictions** - "These hurt our accuracy, remove?"
- **Low confidence predictions** - "These don't look good, delete?"
- **Completed matches** - "Match is over, don't need it?"
- **Duplicate-looking data** - "This looks like a duplicate, remove?"
- **Old team stats** - "Stats are outdated, clear them?"
- **Historical odds** - "Don't need old odds, delete?"

### ✅ Instead:
- **Archive** - Move to archive collection if needed
- **Flag** - Add status field to mark as archived
- **Filter** - Don't show in UI, but keep in database
- **Aggregate** - Summarize old data, keep raw data

---

## Database Maintenance (Safe Operations)

### Allowed Maintenance:
```python
# ✅ CREATE INDEXES (improves performance)
db.collection.create_index('field_name')

# ✅ COMPACT COLLECTION (reclaim space, keeps data)
db.runCommand({'compact': 'collection_name'})

# ✅ REPAIR DATABASE (fixes corruption, keeps data)
db.repairDatabase()

# ✅ BACKUP DATABASE
mongodump --db funbet --out /backup/
```

### NOT Allowed:
```python
# ❌ DROP INDEXES (loses performance optimization)
db.collection.drop_index('index_name')  # Only if recreating immediately

# ❌ REINDEX (only with user approval)
db.collection.reIndex()  # Can cause downtime
```

---

## Emergency Scenarios

### "Database is Full!"
1. **Check disk space**: `df -h`
2. **Compress old data**: Use MongoDB compression
3. **Add storage**: Increase disk size
4. **Archive**: Move to separate archive database (don't delete)

**Solution**: Scale storage UP, not delete data DOWN

### "Performance is Slow!"
1. **Check indexes**: Missing indexes? Create them
2. **Check queries**: Optimize query patterns
3. **Check load**: Too many concurrent requests?
4. **Archive strategy**: Separate hot/cold data (don't delete)

**Solution**: Optimize access, not delete data

### "Found Corrupt Data!"
1. **Document the corruption**: What's wrong?
2. **Isolate the issue**: Which documents?
3. **Fix the data**: Update/repair corrupted fields
4. **Keep original**: Mark as fixed, don't delete

**Solution**: Fix data quality, not delete data

---

## Code Review Checklist

Before committing any code, verify:

- [ ] No `delete_one` or `delete_many` calls
- [ ] No `drop()` calls on collections
- [ ] No `remove()` operations
- [ ] No database dropping
- [ ] Only insert/update operations
- [ ] Indexes created, not dropped
- [ ] If cleanup code: User explicitly requested it

---

## Summary

### The Rule (Say it 3 times):
1. **NEVER DELETE DATA**
2. **NEVER DELETE DATA**
3. **NEVER DELETE DATA**

### If You're Thinking "But...":
- **STOP** and ask user first
- Deleting data is **PERMANENT**
- Can't undo, can't recover
- User decides, not you

### When in Doubt:
- **DON'T DELETE**
- **ASK USER**
- **DOCUMENT REASON**
- **WAIT FOR APPROVAL**

---

**This policy is final and applies to ALL agents, ALL sessions, ALL scenarios.**

**No exceptions. No workarounds. No "just this once."**

**Data preservation is NON-NEGOTIABLE.**

---

Last Updated: November 22, 2025  
Policy Status: **PERMANENT - DO NOT MODIFY**
