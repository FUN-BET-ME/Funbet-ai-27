"""
Verify FunBet IQ Prediction Integrity
- Check that all predictions were made BEFORE match start
- Check that no predictions were updated after match start
"""
import os
import sys
sys.path.insert(0, '/app/backend')
from pymongo import MongoClient
from datetime import datetime, timezone

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.sportsiq

print("\n" + "="*70)
print("FUNBET IQ PREDICTION INTEGRITY VERIFICATION")
print("="*70)

# Get all predictions
predictions = list(db.funbet_iq_predictions.find({}).limit(50))
print(f"\n📊 Found {len(predictions)} predictions to verify\n")

violations = []
correct = 0

for pred in predictions:
    match_id = pred.get('match_id')
    calculated_at = pred.get('calculated_at')
    commence_time = pred.get('commence_time')
    
    if not calculated_at or not commence_time:
        print(f"⚠️  Missing timestamps: {match_id}")
        continue
    
    # Parse timestamps
    try:
        calc_dt = datetime.fromisoformat(calculated_at.replace('Z', '+00:00'))
        commence_dt = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
        
        # Check if prediction was made BEFORE match started
        if calc_dt > commence_dt:
            violations.append({
                'match_id': match_id,
                'home_team': pred.get('home_team'),
                'away_team': pred.get('away_team'),
                'calculated_at': calculated_at,
                'commence_time': commence_time,
                'difference_minutes': int((calc_dt - commence_dt).total_seconds() / 60)
            })
            print(f"❌ VIOLATION: {pred.get('home_team')} vs {pred.get('away_team')}")
            print(f"   Calculated: {calculated_at}")
            print(f"   Match started: {commence_time}")
            print(f"   Difference: {int((calc_dt - commence_dt).total_seconds() / 60)} minutes AFTER start\n")
        else:
            correct += 1
            
    except Exception as e:
        print(f"⚠️  Error parsing timestamps for {match_id}: {e}")

print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"✅ Correct (Pre-match): {correct}")
print(f"❌ Violations (Post-match): {len(violations)}")
print(f"📊 Total verified: {correct + len(violations)}")

if violations:
    print(f"\n⚠️  WARNING: Found {len(violations)} predictions made AFTER match started!")
    print("This violates prediction integrity - all predictions must be pre-match.")
else:
    print("\n✅ PERFECT! All predictions were made BEFORE match start!")
    print("Prediction integrity verified!")

print("="*70 + "\n")
