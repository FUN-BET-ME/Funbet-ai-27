# Admin IQ Page - Detailed Calculations View

**URL**: `/admin/iq`  
**Purpose**: Transparency and confidence in FunBet IQ calculations

---

## Overview

The Admin IQ page provides complete transparency into every FunBet IQ calculation. You can see:

1. **Component Breakdown**: All 6 components with their scores
2. **Weight Application**: How each component contributes to final IQ
3. **Formula Verification**: Mathematical proof that calculation is correct
4. **Step-by-Step Math**: Detailed arithmetic breakdown
5. **Prediction Accuracy**: For completed matches, see if prediction was correct

---

## Features

### 1. Match Selection
- Left panel shows all matches with predictions
- Click any match to see detailed breakdown
- Shows sport, teams, and IQ scores at a glance

### 2. Component Breakdown Tab
**Shows for both teams**:
- Individual component scores (0-100)
- Weight applied to each component
- Contribution to final IQ
- Visual progress bars
- Formula verification (calculated vs stored)

**Example Display**:
```
Home Team: Manchester United
Total IQ: 62.5

Odds IQ:      69.7 × 20% = 13.94
Volume IQ:    73.3 × 20% = 14.66
Movement IQ:  69.4 × 20% = 13.88
Stats IQ:     50.0 × 20% = 10.00
Momentum IQ:  50.0 × 10% = 5.00
H2H IQ:       50.0 × 10% = 5.00
───────────────────────────────
Calculated Total: 62.48
Stored Total: 62.5
✓ Formula Verified
```

### 3. Home Team Details Tab
Detailed explanation of each component for home team:
- What the component measures
- How it's calculated
- What the score means
- Visual representation

### 4. Away Team Details Tab
Same detailed breakdown for away team

### 5. Prediction Result
For completed matches:
- Shows if prediction was correct ✅ or incorrect ❌
- Displays predicted vs actual winner
- Shows verification timestamp

---

## How to Use

### Accessing the Page
```
Navigate to: https://your-domain.com/admin/iq
```

### Inspecting a Prediction

1. **Select a Match**
   - Browse matches in left panel
   - Click to load detailed breakdown

2. **Review Components**
   - See all 6 component scores
   - Verify each contributes correctly
   - Check formula verification badge

3. **Understand Calculations**
   - View step-by-step math in monospace font
   - See weighted contributions
   - Verify totals match

4. **Check Accuracy** (for completed matches)
   - See prediction result (correct/incorrect)
   - Compare predicted vs actual winner
   - Review confidence level

---

## Understanding the Components

### Odds IQ (20%)
**What it shows**: Market implied probability  
**Range**: 0-100  
**Higher = favored by bookmakers**

Example: 69.7
- Team has low odds (favored)
- Market consensus is strong
- 69.7% implied probability of winning

### Volume IQ (20%)
**What it shows**: Market participation & liquidity  
**Range**: 0-100  
**Higher = more bookmakers, stronger consensus**

Example: 73.3
- Multiple bookmakers offering odds
- Low variance between bookmakers
- Confident market

### Movement IQ (20%)
**What it shows**: Odds stability & market direction  
**Range**: 0-100  
**Higher = stable market, confident pricing**

Example: 69.4
- Tight spread between best/worst odds
- Market is stable
- Confident pricing

### Stats IQ (20%)
**What it shows**: Historical team performance  
**Range**: 0-100  
**Higher = better win record, goals, form**

Example: 50.0
- Neutral score (no historical data)
- Will improve as data is collected
- Based on win rate, goals, recent form

### Momentum IQ (10%)
**What it shows**: Recent form (last 10 games)  
**Range**: 0-100  
**Higher = better recent results**

Scoring:
- Home win: +3 points
- Draw: +2 points
- Away win: +5 points
- Unbeaten: +2 per game
- Draw in streak: +1 extra

Example: 50.0
- Neutral score (no data)
- Will reflect actual recent form when data available

### H2H IQ (10%)
**What it shows**: Head-to-head history  
**Range**: 0-100  
**Higher = better record against this opponent**

Example: 50.0
- Neutral score (no H2H data)
- Will show actual win % when data available

---

## Formula Verification

The page automatically verifies calculations:

**✓ Formula Verified** (Green Badge)
- Calculated total matches stored total
- Math is correct
- Prediction is valid

**✗ Mismatch Detected** (Red Badge)
- Discrepancy between calculated and stored
- Indicates potential issue
- Should be investigated

---

## Backfill Status

### Current Coverage
- ✅ **67%** of completed matches have predictions
- ✅ Backfill runs **twice daily** (6AM & 6PM UTC)
- ✅ Uses **historical odds** from 1 hour before kickoff

### How Backfilling Works

1. **Identify completed matches** without predictions
2. **Fetch historical odds** from The Odds API
   - Odds from 1 hour before match start
   - Legitimate pre-match betting data
3. **Calculate FunBet IQ** using historical odds
4. **Verify prediction** against actual result
5. **Store with verification** (correct/incorrect)

### Viewing Backfilled Predictions

On admin page, backfilled predictions show:
- Full component breakdown
- Prediction accuracy (✅/❌)
- "Calculated at" timestamp (pre-match)
- "Verified at" timestamp (post-match)

---

## Example Use Cases

### 1. Verify Algorithm Correctness
**Goal**: Ensure calculations are mathematically correct

**Steps**:
1. Go to `/admin/iq`
2. Select any match
3. Check "Formula Verified" badge
4. Review step-by-step math
5. Confirm calculated = stored

### 2. Understand Why a Prediction Was Made
**Goal**: See reasoning behind prediction

**Steps**:
1. Select a match
2. Go to "Component Breakdown" tab
3. See which components favored which team
4. Identify strongest signals (highest scores)

Example:
```
Home Team: 62.5
- Odds IQ: 69.7 (favored by bookmakers)
- Volume IQ: 73.3 (strong market)
- Movement IQ: 69.4 (stable)

Away Team: 38.9
- Odds IQ: 30.2 (underdog)
- Volume IQ: 26.6 (weak market)
- Movement IQ: 30.6 (unstable)

Prediction: HOME (backed by all components)
```

### 3. Track Prediction Accuracy
**Goal**: See how well predictions perform

**Steps**:
1. Filter to completed matches
2. Check prediction results (✅/❌)
3. Review confidence levels
4. Identify patterns

### 4. Debug Component Issues
**Goal**: Find why component shows 50.0 (neutral)

**Steps**:
1. Select match with 50.0 scores
2. Check component explanations
3. Note: 50.0 = "No data available"
4. Solution: Wait for historical data job to populate

---

## Data Freshness

### When Predictions are Calculated
- **Real-time**: For upcoming matches
- **Pre-match only**: Never after match starts
- **Background job**: Every 10 minutes

### When Backfilling Occurs
- **Twice daily**: 6 AM & 6 PM UTC
- **On startup**: Immediate backfill run
- **Scope**: Last 7 days of completed matches

### When Historical Data Updates
- **Every 12 hours**: Team stats and H2H
- **On startup**: Initial data fetch
- **Manual**: Run `python populate_historical_data.py`

---

## Troubleshooting

### Issue: Match shows "No FunBet IQ prediction found"

**Possible Causes**:
1. Match is too old (beyond prediction window)
2. Match hasn't started yet and calculation pending
3. Backfill hasn't reached this match yet

**Solution**: 
- Wait for next calculation cycle (10 min)
- Or wait for next backfill (6 AM/6 PM)

### Issue: Components show 50.0 (neutral)

**Cause**: No historical data available

**Solution**:
- Wait for historical data job (runs every 12 hours)
- Or manually trigger: `python populate_historical_data.py`
- 50.0 is expected for teams without data

### Issue: Formula verification fails

**Cause**: Rare calculation inconsistency

**Solution**:
- Report the match ID
- Run recalculation: `python recalculate_all_funbet_iq.py`

---

## Technical Details

### API Endpoint Used
```
GET /api/funbet-iq/match/{match_id}
```

Returns:
```json
{
  "success": true,
  "match": {
    "match_id": "...",
    "home_team": "...",
    "away_team": "...",
    "home_iq": 62.5,
    "away_iq": 38.9,
    "home_components": {
      "odds_iq": 69.7,
      "volume_iq": 73.3,
      "movement_iq": 69.4,
      "stats_iq": 50.0,
      "momentum_iq": 50.0,
      "h2h_iq": 50.0
    },
    "away_components": { ... },
    "predicted_winner": "home",
    "confidence": "High",
    "verdict": "Manchester United favoured",
    "calculated_at": "2025-11-22T18:41:...",
    "prediction_correct": true,
    "verified_at": "2025-11-22T22:00:..."
  }
}
```

### Frontend Component
**Location**: `/app/frontend/src/pages/AdminIQ.jsx`

**Features**:
- Real-time formula verification
- Interactive match selection
- Responsive 3-column layout
- Color-coded confidence badges
- Progress bars for visual representation

---

## Future Enhancements

### Planned Features
1. **Filtering & Search**
   - Filter by sport
   - Search by team name
   - Filter by confidence level
   - Show only correct/incorrect predictions

2. **Historical Comparison**
   - Compare predictions over time
   - Track accuracy trends
   - Component performance analysis

3. **Export Functionality**
   - Export calculations to CSV
   - Generate PDF reports
   - Share specific predictions

4. **Real-time Updates**
   - WebSocket integration
   - Live calculation updates
   - Auto-refresh on new predictions

---

## Conclusion

The Admin IQ page provides **complete transparency** into FunBet IQ calculations:

✅ **See every component score**  
✅ **Verify mathematical correctness**  
✅ **Understand prediction reasoning**  
✅ **Track accuracy for completed matches**  
✅ **Build confidence in the system**

**Access now**: Navigate to `/admin/iq` on your frontend

---

**End of Documentation**
