# 📊 FunBet Database Analysis Report
**Generated**: November 24, 2025 - 14:07 UTC

---

## 🔴 LIVE MATCHES

| Sport      | Total Live | With IQ | Missing IQ |
|------------|------------|---------|------------|
| Football   | 0          | 0       | 0          |
| Cricket    | 0          | 0       | 0          |
| Basketball | 0          | 0       | 0          |
| **TOTAL**  | **0**      | **0**   | **0**      |

✅ **Status**: No live matches at this time (correctly filtered)

---

## 📅 UPCOMING MATCHES (Next 30 Days)

| Sport      | Total Upcoming | With IQ | Missing IQ | Coverage |
|------------|----------------|---------|------------|----------|
| Football   | 400            | 292     | 108        | 73.0%    |
| Cricket    | 2              | 0       | 2          | 0.0%     |
| Basketball | 82             | 0       | 82         | 0.0%     |
| **TOTAL**  | **484**        | **292** | **192**    | **60.3%** |

⚠️ **Issue**: 
- **192 upcoming matches** (39.7%) are **missing IQ predictions**
- Basketball: 0% coverage (82 matches)
- Cricket: 0% coverage (2 matches)  
- Football: Best coverage at 73%

---

## ✅ COMPLETED MATCHES (Last 7 Days)

| Sport      | Completed | With IQ | Verified | Pending | No IQ |
|------------|-----------|---------|----------|---------|-------|
| Football   | 194       | 194     | 194      | 0       | 0     |
| Cricket    | 2         | 2       | 2        | 0       | 0     |
| Basketball | 175       | 175     | 175      | 0       | 0     |
| **TOTAL**  | **371**   | **371** | **371**  | **0**   | **0** |

✅ **Perfect**: 
- 100% of completed matches have IQ predictions
- 100% of completed matches are verified
- 0 pending verifications

---

## 🧠 FUNBET IQ PREDICTIONS SUMMARY

| Sport      | Total IQ | Verified | Correct | Wrong | Pending | Accuracy |
|------------|----------|----------|---------|-------|---------|----------|
| Football   | 581      | 217      | 130     | 87    | 364     | 59.9%    |
| Cricket    | 20       | 5        | 3       | 2     | 15      | 60.0%    |
| Basketball | 301      | 202      | 147     | 55    | 99      | 72.8%    |
| **TOTAL**  | **902**  | **424**  | **280** | **144** | **478** | **66.0%** |

### Key Insights:
- **Overall Accuracy**: 66.0% (280 correct out of 424 verified)
- **Best Performance**: Basketball at 72.8%
- **Football & Cricket**: ~60% accuracy
- **Pending Verification**: 478 predictions (53% of total)

---

## 🔍 DATA INTEGRITY CHECK

### Database Statistics:
- **Total Matches**: 1,140
- **Total IQ Predictions**: 902
- **Old Matches (>31 days)**: 0 ✅

### Coverage by Category:
- **Live Matches**: 0/0 (No live matches currently)
- **Upcoming Matches**: 292/484 (60.3%) ⚠️
- **Completed Matches**: 371/371 (100.0%) ✅

---

## ⚠️ ISSUES & RECOMMENDATIONS

### Critical Issue:
**192 upcoming matches missing IQ predictions** (39.7% coverage gap)

### Breakdown:
1. **Basketball**: 82 matches with 0% IQ coverage
   - **Action**: Background worker needs to calculate IQ for basketball matches
   
2. **Cricket**: 2 matches with 0% IQ coverage
   - **Action**: Ensure cricket matches get IQ calculations

3. **Football**: 108 matches missing IQ (73% coverage)
   - **Action**: Calculate IQ for remaining 108 matches

### Recommendations:

#### Immediate Actions:
1. **Trigger IQ calculation job** for all upcoming matches
2. **Monitor background worker** - ensure it's calculating IQ for new matches
3. **Check basketball/cricket IQ logic** - appears to be skipping these sports

#### Long-term:
1. **Real-time IQ calculation**: Calculate IQ immediately when new odds are fetched
2. **Missing IQ alerts**: Set up monitoring for matches without IQ predictions
3. **Backfill job**: Create one-time job to calculate IQ for existing 192 matches

---

## 📈 PERFORMANCE METRICS

### Prediction Accuracy by Sport:
```
Basketball:  ████████████████████████████████████ 72.8% (Best)
Cricket:     ████████████████████ 60.0%
Football:    ████████████████████ 59.9%
Overall:     ████████████████████████ 66.0%
```

### Data Completeness:
```
Completed Matches: ██████████████████████████████ 100% ✅
Upcoming Matches:  ████████████████ 60.3% ⚠️
Live Matches:      ██████████████████████████████ 100% ✅ (0/0)
```

---

## ✅ STRENGTHS

1. ✅ **Perfect completed match coverage** (100%)
2. ✅ **All predictions verified** (0 pending for completed)
3. ✅ **No stale data** (0 matches >31 days old)
4. ✅ **Live match filtering working correctly** (0 old matches showing as live)
5. ✅ **Good basketball accuracy** (72.8%)

## 🔧 NEEDS IMPROVEMENT

1. ⚠️ **Upcoming match IQ coverage** (only 60.3%)
2. ⚠️ **Basketball IQ calculation** (0 of 82 upcoming)
3. ⚠️ **Cricket IQ calculation** (0 of 2 upcoming)
4. ⚠️ **Football prediction accuracy** (59.9% - could be higher)

---

**Report End**
