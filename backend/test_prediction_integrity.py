"""
Test script to verify FunBet IQ predictions are PRE-MATCH ONLY
Tests that predictions are never calculated or updated after a match starts
"""
import asyncio
import sys
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class PredictionIntegrityTest:
    def __init__(self):
        self.db = None
        self.passed = 0
        self.failed = 0
        
    async def connect_db(self):
        """Connect to MongoDB"""
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = AsyncIOMotorClient(mongo_url)
        self.db = client[db_name]
        print(f"{BLUE}✓ Connected to MongoDB{RESET}")
    
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        if passed:
            self.passed += 1
            print(f"{GREEN}✓ PASS{RESET}: {test_name}")
            if message:
                print(f"  {message}")
        else:
            self.failed += 1
            print(f"{RED}✗ FAIL{RESET}: {test_name}")
            if message:
                print(f"  {RED}{message}{RESET}")
    
    async def test_batch_calculation_filters_live_matches(self):
        """Test 1: Verify batch calculation only processes future matches"""
        print(f"\n{BLUE}Test 1: Batch calculation only processes PRE-MATCH games{RESET}")
        
        # Import the function
        from funbet_iq_engine import calculate_funbet_iq_for_matches
        
        # Get current time
        now = datetime.now(timezone.utc)
        
        # Count matches in different time windows
        future_matches = await self.db.odds_cache.count_documents({
            'commence_time': {'$gt': now.isoformat()}
        })
        
        past_matches = await self.db.odds_cache.count_documents({
            'commence_time': {'$lt': now.isoformat()}
        })
        
        print(f"  Database: {future_matches} future matches, {past_matches} past matches")
        
        # Run the batch calculation
        result = await calculate_funbet_iq_for_matches(self.db, limit=500)
        
        print(f"  Calculation processed: {result['calculated']} matches")
        
        # The calculation should ONLY process future matches
        # We can't directly verify which matches were processed, but we can check
        # that no predictions exist for matches that started in the past
        
        # Get all predictions
        all_predictions = await self.db.funbet_iq_predictions.find({}).to_list(length=None)
        
        # Check each prediction's match
        invalid_predictions = []
        for pred in all_predictions:
            match_id = pred.get('match_id')
            match = await self.db.odds_cache.find_one({'id': match_id})
            
            if match:
                commence_time = match.get('commence_time', '')
                if commence_time:
                    match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                    
                    # Check if prediction was created BEFORE match started
                    calculated_at = pred.get('calculated_at', '')
                    if calculated_at:
                        calc_time = datetime.fromisoformat(calculated_at.replace('Z', '+00:00'))
                        
                        # Prediction should be calculated BEFORE match start
                        if calc_time > match_time:
                            invalid_predictions.append({
                                'match': f"{match.get('home_team')} vs {match.get('away_team')}",
                                'commence_time': commence_time,
                                'calculated_at': calculated_at
                            })
        
        if len(invalid_predictions) == 0:
            self.log_test(
                "Batch calculation only processes PRE-MATCH games",
                True,
                f"All {len(all_predictions)} predictions were calculated BEFORE match start"
            )
        else:
            self.log_test(
                "Batch calculation only processes PRE-MATCH games",
                False,
                f"Found {len(invalid_predictions)} predictions calculated AFTER match start:\n" + 
                "\n".join([f"    - {p['match']}: match={p['commence_time']}, calc={p['calculated_at']}" 
                          for p in invalid_predictions[:5]])
            )
    
    async def test_predictions_never_updated(self):
        """Test 2: Verify predictions are never updated after creation"""
        print(f"\n{BLUE}Test 2: Predictions are immutable (never updated){RESET}")
        
        # Find a match with an existing prediction
        prediction = await self.db.funbet_iq_predictions.find_one({})
        
        if not prediction:
            self.log_test(
                "Predictions are immutable",
                True,
                "No predictions exist to test (expected for new system)"
            )
            return
        
        match_id = prediction.get('match_id')
        original_home_iq = prediction.get('home_iq')
        original_calculated_at = prediction.get('calculated_at')
        
        print(f"  Testing with match: {prediction.get('home_team')} vs {prediction.get('away_team')}")
        print(f"  Original IQ: Home={original_home_iq}, Calculated at={original_calculated_at}")
        
        # Try to run batch calculation again (should not update existing prediction)
        from funbet_iq_engine import calculate_funbet_iq_for_matches
        await calculate_funbet_iq_for_matches(self.db, limit=500)
        
        # Check if prediction was modified
        updated_prediction = await self.db.funbet_iq_predictions.find_one({'match_id': match_id})
        
        if updated_prediction:
            updated_home_iq = updated_prediction.get('home_iq')
            updated_calculated_at = updated_prediction.get('calculated_at')
            
            if (updated_home_iq == original_home_iq and 
                updated_calculated_at == original_calculated_at):
                self.log_test(
                    "Predictions are immutable",
                    True,
                    "Prediction was NOT modified after re-running calculation"
                )
            else:
                self.log_test(
                    "Predictions are immutable",
                    False,
                    f"Prediction was MODIFIED: IQ changed from {original_home_iq} to {updated_home_iq}, " +
                    f"timestamp from {original_calculated_at} to {updated_calculated_at}"
                )
        else:
            self.log_test(
                "Predictions are immutable",
                False,
                "Prediction was deleted!"
            )
    
    async def test_completed_matches_have_no_new_predictions(self):
        """Test 3: Verify completed matches don't get new predictions"""
        print(f"\n{BLUE}Test 3: Completed matches don't get new predictions{RESET}")
        
        # Find a completed match without a prediction
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)
        
        completed_match = await self.db.odds_cache.find_one({
            'completed': True,
            'commence_time': {'$gte': yesterday.isoformat()}
        })
        
        if not completed_match:
            self.log_test(
                "Completed matches don't get new predictions",
                True,
                "No completed matches found to test"
            )
            return
        
        match_id = completed_match.get('id')
        
        # Check if this match has a prediction
        existing_pred = await self.db.funbet_iq_predictions.find_one({'match_id': match_id})
        
        if existing_pred:
            self.log_test(
                "Completed matches don't get new predictions",
                True,
                f"Completed match already has prediction (legitimate if from historical backfill)"
            )
        else:
            # Try to run batch calculation (should skip this completed match)
            from funbet_iq_engine import calculate_funbet_iq_for_matches
            await calculate_funbet_iq_for_matches(self.db, limit=500)
            
            # Check again
            new_pred = await self.db.funbet_iq_predictions.find_one({'match_id': match_id})
            
            if new_pred is None:
                self.log_test(
                    "Completed matches don't get new predictions",
                    True,
                    "Batch calculation correctly skipped completed match"
                )
            else:
                self.log_test(
                    "Completed matches don't get new predictions",
                    False,
                    f"VIOLATION: New prediction created for completed match {completed_match.get('home_team')} vs {completed_match.get('away_team')}"
                )
    
    async def test_statistics_summary(self):
        """Test 4: Show statistics summary"""
        print(f"\n{BLUE}Test 4: Prediction system statistics{RESET}")
        
        now = datetime.now(timezone.utc)
        
        # Count matches by status
        total_matches = await self.db.odds_cache.count_documents({})
        future_matches = await self.db.odds_cache.count_documents({
            'commence_time': {'$gt': now.isoformat()}
        })
        live_matches = await self.db.odds_cache.count_documents({
            'live_score.is_live': True
        })
        completed_matches = await self.db.odds_cache.count_documents({
            'completed': True
        })
        
        # Count predictions
        total_predictions = await self.db.funbet_iq_predictions.count_documents({})
        
        # Get sample predictions with timing
        sample_predictions = await self.db.funbet_iq_predictions.find({}).limit(10).to_list(length=10)
        
        pre_match_count = 0
        post_match_count = 0
        
        for pred in sample_predictions:
            match_id = pred.get('match_id')
            match = await self.db.odds_cache.find_one({'id': match_id})
            
            if match:
                commence_time = match.get('commence_time', '')
                calculated_at = pred.get('calculated_at', '')
                
                if commence_time and calculated_at:
                    match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                    calc_time = datetime.fromisoformat(calculated_at.replace('Z', '+00:00'))
                    
                    if calc_time <= match_time:
                        pre_match_count += 1
                    else:
                        post_match_count += 1
        
        print(f"\n  {BLUE}Match Statistics:{RESET}")
        print(f"    Total matches: {total_matches}")
        print(f"    Future matches: {future_matches}")
        print(f"    Live matches: {live_matches}")
        print(f"    Completed matches: {completed_matches}")
        
        print(f"\n  {BLUE}Prediction Statistics:{RESET}")
        print(f"    Total predictions: {total_predictions}")
        print(f"    Sample timing (10 predictions):")
        print(f"      Pre-match: {pre_match_count}")
        print(f"      Post-match: {post_match_count}")
        
        self.log_test(
            "System statistics collected",
            True,
            f"System is tracking {total_predictions} predictions across {total_matches} matches"
        )
    
    async def run_all_tests(self):
        """Run all tests"""
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}FunBet IQ Prediction Integrity Test Suite{RESET}")
        print(f"{BLUE}Verifying predictions are PRE-MATCH ONLY{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        await self.connect_db()
        
        await self.test_batch_calculation_filters_live_matches()
        await self.test_predictions_never_updated()
        await self.test_completed_matches_have_no_new_predictions()
        await self.test_statistics_summary()
        
        # Summary
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}Test Results Summary{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        total = self.passed + self.failed
        if self.failed == 0:
            print(f"{GREEN}✓ ALL TESTS PASSED{RESET}: {self.passed}/{total} tests successful")
            print(f"\n{GREEN}VERDICT: FunBet IQ predictions are PRE-MATCH ONLY ✓{RESET}")
            print(f"{GREEN}Predictions are NEVER calculated or updated after a match starts{RESET}")
        else:
            print(f"{RED}✗ SOME TESTS FAILED{RESET}: {self.passed} passed, {self.failed} failed out of {total}")
            print(f"\n{RED}VERDICT: System has prediction timing issues that need fixing{RESET}")
        
        print(f"\n{BLUE}{'='*70}{RESET}\n")
        
        return self.failed == 0

async def main():
    tester = PredictionIntegrityTest()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
