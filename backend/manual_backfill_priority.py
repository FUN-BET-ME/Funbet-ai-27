"""
Manual Backfill Script for Football & Cricket Priority
Aggressively backfills predictions for completed matches
Priority: Football > Cricket > Basketball
"""
import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
from funbet_iq_engine import calculate_funbet_iq
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

async def backfill_sport(db, sport_name, sport_regex, limit, days_back=30):
    """Backfill predictions for a specific sport"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}Backfilling {sport_name} (last {days_back} days){RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
    
    # Find completed matches without predictions
    pipeline = [
        {
            '$match': {
                'completed': True,
                'commence_time': {'$gte': cutoff_date.isoformat()},
                'sport_key': {'$regex': sport_regex, '$options': 'i'}
            }
        },
        {
            '$lookup': {
                'from': 'funbet_iq_predictions',
                'localField': 'id',
                'foreignField': 'match_id',
                'as': 'iq_prediction'
            }
        },
        {
            '$match': {
                'iq_prediction': {'$eq': []}
            }
        },
        {
            '$limit': limit
        }
    ]
    
    matches = await db.odds_cache.aggregate(pipeline).to_list(length=limit)
    
    print(f"{YELLOW}Found {len(matches)} {sport_name} matches to backfill{RESET}")
    
    if len(matches) == 0:
        print(f"{GREEN}✓ No matches need backfilling{RESET}")
        return 0
    
    backfilled = 0
    errors = 0
    
    for i, match in enumerate(matches, 1):
        try:
            home = match.get('home_team')
            away = match.get('away_team')
            match_id = match.get('id')
            
            print(f"  [{i}/{len(matches)}] {home} vs {away}...", end=' ')
            
            # Check if prediction already exists (double-check)
            existing = await db.funbet_iq_predictions.find_one({'match_id': match_id})
            if existing:
                print(f"{YELLOW}(already exists){RESET}")
                continue
            
            # Calculate IQ using current match data
            iq_result = await calculate_funbet_iq(match, db)
            
            if iq_result:
                # Insert prediction
                await db.funbet_iq_predictions.insert_one(iq_result)
                backfilled += 1
                print(f"{GREEN}✓{RESET}")
            else:
                print(f"{RED}✗ (calc failed){RESET}")
                errors += 1
                
        except Exception as e:
            print(f"{RED}✗ Error: {e}{RESET}")
            errors += 1
    
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}{sport_name} Backfill Complete:{RESET}")
    print(f"{GREEN}  ✓ Backfilled: {backfilled}{RESET}")
    if errors > 0:
        print(f"{RED}  ✗ Errors: {errors}{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")
    
    return backfilled

async def main():
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}FunBet IQ Priority Backfill{RESET}")
    print(f"{BLUE}Priority: Football > Cricket > Basketball{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")
    
    # Connect to database
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"{GREEN}✓ Connected to MongoDB{RESET}")
    
    total_backfilled = 0
    
    # Priority 1: Football (100 matches, 30 days back)
    football_count = await backfill_sport(
        db, 
        "Football", 
        "soccer", 
        limit=100, 
        days_back=30
    )
    total_backfilled += football_count
    
    # Priority 2: Cricket (50 matches, 30 days back)
    cricket_count = await backfill_sport(
        db, 
        "Cricket", 
        "cricket", 
        limit=50, 
        days_back=30
    )
    total_backfilled += cricket_count
    
    # Priority 3: Basketball (30 matches, 30 days back)
    basketball_count = await backfill_sport(
        db, 
        "Basketball", 
        "basketball", 
        limit=30, 
        days_back=30
    )
    total_backfilled += basketball_count
    
    # Summary
    print(f"\n{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}TOTAL BACKFILL SUMMARY{RESET}")
    print(f"{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}  ⚽ Football: {football_count} matches{RESET}")
    print(f"{GREEN}  🏏 Cricket: {cricket_count} matches{RESET}")
    print(f"{GREEN}  🏀 Basketball: {basketball_count} matches{RESET}")
    print(f"{GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{GREEN}  ✓ Total: {total_backfilled} predictions created{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
