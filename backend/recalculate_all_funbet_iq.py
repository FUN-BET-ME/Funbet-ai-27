"""
Recalculate all FunBet IQ predictions with new V4 formula
Deletes all existing predictions and recalculates using new percentages:
20% Odds, 20% Volume, 20% Movement, 20% Team Stats, 10% Momentum, 10% H2H
"""
import asyncio
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

async def recalculate_all():
    """Delete all predictions and recalculate with new formula"""
    try:
        # Connect to database
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        print(f"{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}FunBet IQ V4 - Recalculation Script{RESET}")
        print(f"{BLUE}New Formula: 20% Odds + 20% Volume + 20% Movement + 20% Stats + 10% Momentum + 10% H2H{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        # Step 1: Count existing predictions
        existing_count = await db.funbet_iq_predictions.count_documents({})
        print(f"{YELLOW}Step 1: Found {existing_count} existing predictions{RESET}")
        
        # Step 2: Delete all existing predictions
        if existing_count > 0:
            print(f"{YELLOW}Step 2: Deleting all existing predictions...{RESET}")
            result = await db.funbet_iq_predictions.delete_many({})
            print(f"{GREEN}✓ Deleted {result.deleted_count} predictions{RESET}\n")
        else:
            print(f"{YELLOW}Step 2: No predictions to delete{RESET}\n")
        
        # Step 3: Count matches to recalculate
        now = datetime.now(timezone.utc)
        now_str = now.isoformat().replace('+00:00', 'Z')
        
        # Get all future matches (pre-match only)
        future_matches_count = await db.odds_cache.count_documents({
            'commence_time': {'$gt': now_str}
        })
        
        print(f"{YELLOW}Step 3: Found {future_matches_count} future matches to calculate{RESET}\n")
        
        # Step 4: Trigger recalculation using the background job
        print(f"{YELLOW}Step 4: Triggering FunBet IQ calculation for all sports...{RESET}")
        
        from funbet_iq_engine import calculate_funbet_iq_for_matches
        
        result = await calculate_funbet_iq_for_matches(db, limit=1000)
        
        print(f"{GREEN}✓ Calculation complete!{RESET}")
        print(f"  Total matches processed: {result['total_matches']}")
        print(f"  Successfully calculated: {result['calculated']}")
        print(f"  Errors: {result['errors']}")
        
        if result['errors'] > 0 and result.get('error_details'):
            print(f"\n{YELLOW}Error details (first 5):{RESET}")
            for error in result['error_details'][:5]:
                print(f"  - {error}")
        
        # Step 5: Verify recalculation
        print(f"\n{YELLOW}Step 5: Verifying recalculation...{RESET}")
        new_count = await db.funbet_iq_predictions.count_documents({})
        print(f"{GREEN}✓ New prediction count: {new_count}{RESET}")
        
        # Sample a few predictions to show new components
        sample_predictions = await db.funbet_iq_predictions.find({}).limit(3).to_list(length=3)
        
        if sample_predictions:
            print(f"\n{BLUE}Sample predictions with new V4 components:{RESET}")
            for pred in sample_predictions:
                print(f"\n  {pred.get('home_team')} vs {pred.get('away_team')}")
                print(f"    Home IQ: {pred.get('home_iq')} | Away IQ: {pred.get('away_iq')}")
                
                home_comp = pred.get('home_components', {})
                if 'odds_iq' in home_comp:
                    print(f"    Home Components (V4):")
                    print(f"      • Odds IQ: {home_comp.get('odds_iq')}")
                    print(f"      • Volume IQ: {home_comp.get('volume_iq')}")
                    print(f"      • Movement IQ: {home_comp.get('movement_iq')}")
                    print(f"      • Stats IQ: {home_comp.get('stats_iq')}")
                    print(f"      • Momentum IQ: {home_comp.get('momentum_iq')}")
                    print(f"      • H2H IQ: {home_comp.get('h2h_iq')}")
                else:
                    print(f"    {YELLOW}Warning: Prediction still using old components{RESET}")
        
        print(f"\n{GREEN}{'='*70}{RESET}")
        print(f"{GREEN}Recalculation Complete!{RESET}")
        print(f"{GREEN}All predictions now use FunBet IQ V4 formula{RESET}")
        print(f"{GREEN}{'='*70}{RESET}\n")
        
    except Exception as e:
        print(f"\n{YELLOW}Error during recalculation: {e}{RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(recalculate_all())
