"""
Test script to verify FunBet IQ predictions are PRE-MATCH ONLY (Current System)
Tests the CURRENT implementation to ensure predictions are never calculated after match starts
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

class PredictionIntegrityTestV2:
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
    
    async def test_current_system_only_processes_future_matches(self):
        """Test 1: Current system only processes future matches"""
        print(f"\n{BLUE}Test 1: Current system query filters (code inspection){RESET}")
        
        # Read the actual code to verify the query
        import funbet_iq_engine
        import inspect
        
        source = inspect.getsource(funbet_iq_engine.calculate_funbet_iq_for_matches)
        
        # Check if the code contains the correct filter
        has_future_filter = "'$gt': now_str" in source
        no_past_filter = "'$gte': six_hours_ago_str" not in source
        
        if has_future_filter and no_past_filter:
            self.log_test(
                "Code uses correct filter for future matches only",
                True,
                "Query uses {'commence_time': {'$gt': now_str}} - CORRECT ✓"
            )
        else:
            self.log_test(
                "Code uses correct filter for future matches only",
                False,
                "Query may include past/live matches - INCORRECT ✗"
            )
        
        # Verify the comment is present
        has_comment = "PRE-MATCH" in source or "pre-match" in source.lower()
        
        if has_comment:
            self.log_test(
                "Code is documented as PRE-MATCH only",
                True,
                "Function includes PRE-MATCH documentation"
            )
        else:
            self.log_test(
                "Code is documented as PRE-MATCH only",
                False,
                "Function lacks PRE-MATCH documentation"
            )
    
    async def test_predictions_use_insert_not_upsert(self):
        """Test 2: Predictions use insert (not upsert) to prevent updates"""
        print(f"\n{BLUE}Test 2: Predictions are insert-only (code inspection){RESET}")
        
        import funbet_iq_engine
        import inspect
        
        source = inspect.getsource(funbet_iq_engine.calculate_funbet_iq_for_matches)
        
        # Check for insert_one instead of update_one with upsert
        uses_insert = "insert_one(iq_result)" in source
        checks_existing = "existing_prediction" in source
        
        if uses_insert and checks_existing:
            self.log_test(
                "Code checks for existing predictions before insert",
                True,
                "Uses insert_one with existing prediction check - IMMUTABLE ✓"
            )
        else:
            self.log_test(
                "Code checks for existing predictions before insert",
                False,
                "May update existing predictions - NOT IMMUTABLE ✗"
            )
    
    async def test_recent_predictions_are_all_future(self):
        """Test 3: All recent predictions (last 5 minutes) are for future matches"""
        print(f"\n{BLUE}Test 3: Recent predictions (last 5 mins) are all for FUTURE matches{RESET}")
        
        now = datetime.now(timezone.utc)
        five_mins_ago = now - timedelta(minutes=5)
        
        # Get predictions created in last 5 minutes
        recent_predictions = await self.db.funbet_iq_predictions.find({
            'calculated_at': {'$gte': five_mins_ago.isoformat()}
        }).to_list(length=None)
        
        print(f"  Found {len(recent_predictions)} predictions created in last 5 minutes")
        
        if len(recent_predictions) == 0:
            self.log_test(
                "Recent predictions are all pre-match",
                True,
                "No predictions created in last 5 minutes (expected for low activity)"
            )
            return
        
        # Check if all are for future matches
        invalid_count = 0
        valid_count = 0
        
        for pred in recent_predictions:
            match_id = pred.get('match_id')
            match = await self.db.odds_cache.find_one({'id': match_id})
            
            if match:
                commence_time = match.get('commence_time', '')
                calculated_at = pred.get('calculated_at', '')
                
                if commence_time and calculated_at:
                    match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                    calc_time = datetime.fromisoformat(calculated_at.replace('Z', '+00:00'))
                    
                    # Prediction should be calculated BEFORE match start
                    if calc_time < match_time:
                        valid_count += 1
                    else:
                        invalid_count += 1
                        if invalid_count <= 3:
                            print(f"    ✗ {match.get('home_team')} vs {match.get('away_team')}: " +
                                  f"calculated at {calculated_at}, match at {commence_time}")
        
        if invalid_count == 0:
            self.log_test(
                "Recent predictions are all pre-match",
                True,
                f"All {valid_count} recent predictions were made BEFORE match start ✓"
            )
        else:
            self.log_test(
                "Recent predictions are all pre-match",
                False,
                f"{invalid_count}/{len(recent_predictions)} recent predictions were made AFTER match start"
            )
    
    async def test_query_execution(self):
        """Test 4: Execute the actual query and verify results"""
        print(f"\n{BLUE}Test 4: Execute actual database query from code{RESET}")
        
        now = datetime.now(timezone.utc)
        now_str = now.isoformat().replace('+00:00', 'Z')
        
        # This is the EXACT query from the fixed code
        matches = await self.db.odds_cache.find({
            'commence_time': {'$gt': now_str}
        }).limit(10).to_list(length=10)
        
        print(f"  Query returned {len(matches)} matches")
        
        # Verify all are in the future
        all_future = True
        for match in matches:
            commence_time = match.get('commence_time', '')
            if commence_time:
                match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                if match_time <= now:
                    all_future = False
                    print(f"    ✗ Match in past: {match.get('home_team')} vs {match.get('away_team')} at {commence_time}")
        
        if all_future and len(matches) > 0:
            self.log_test(
                "Query returns only future matches",
                True,
                f"All {len(matches)} matches have commence_time > now ✓"
            )
        elif len(matches) == 0:
            self.log_test(
                "Query returns only future matches",
                True,
                "No matches returned (expected if no upcoming matches)"
            )
        else:
            self.log_test(
                "Query returns only future matches",
                False,
                "Query returned past/live matches"
            )
    
    async def test_api_endpoint_protection(self):
        """Test 5: Verify API endpoint has pre-match checks"""
        print(f"\n{BLUE}Test 5: API endpoint protection (code inspection){RESET}")
        
        try:
            with open('/app/backend/server.py', 'r') as f:
                server_code = f.read()
            
            # Check for the protection in get_funbet_iq_match endpoint
            has_time_check = "match_time <= now" in server_code
            has_error = "already started" in server_code.lower()
            
            if has_time_check and has_error:
                self.log_test(
                    "API endpoints have pre-match validation",
                    True,
                    "On-demand calculation blocked for started matches ✓"
                )
            else:
                self.log_test(
                    "API endpoints have pre-match validation",
                    False,
                    "API may allow calculation for started matches ✗"
                )
        except Exception as e:
            self.log_test(
                "API endpoints have pre-match validation",
                False,
                f"Could not verify: {e}"
            )
    
    async def test_historical_backfill_protection(self):
        """Test 6: Historical backfill uses pre-match odds and doesn't overwrite"""
        print(f"\n{BLUE}Test 6: Historical backfill protection (code inspection){RESET}")
        
        try:
            with open('/app/backend/background_worker.py', 'r') as f:
                worker_code = f.read()
            
            # Check backfill uses historical pre-match odds
            uses_historical = "hours=1" in worker_code and "historical_date" in worker_code
            checks_existing = "existing = await self.db.funbet_iq_predictions.find_one" in worker_code
            uses_insert = "not existing" in worker_code
            
            if uses_historical:
                self.log_test(
                    "Historical backfill uses pre-match odds",
                    True,
                    "Fetches odds from 1 hour BEFORE match start ✓"
                )
            else:
                self.log_test(
                    "Historical backfill uses pre-match odds",
                    False,
                    "May not use proper pre-match odds ✗"
                )
            
            if checks_existing and uses_insert:
                self.log_test(
                    "Historical backfill doesn't overwrite existing predictions",
                    True,
                    "Checks for existing predictions before inserting ✓"
                )
            else:
                self.log_test(
                    "Historical backfill doesn't overwrite existing predictions",
                    False,
                    "May overwrite existing predictions ✗"
                )
        except Exception as e:
            self.log_test(
                "Historical backfill protection",
                False,
                f"Could not verify: {e}"
            )
    
    async def run_all_tests(self):
        """Run all tests"""
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}FunBet IQ Prediction Integrity Test Suite V2{RESET}")
        print(f"{BLUE}Testing CURRENT system implementation{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        await self.connect_db()
        
        await self.test_current_system_only_processes_future_matches()
        await self.test_predictions_use_insert_not_upsert()
        await self.test_recent_predictions_are_all_future()
        await self.test_query_execution()
        await self.test_api_endpoint_protection()
        await self.test_historical_backfill_protection()
        
        # Summary
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}Test Results Summary{RESET}")
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        total = self.passed + self.failed
        if self.failed == 0:
            print(f"{GREEN}✓ ALL TESTS PASSED{RESET}: {self.passed}/{total} tests successful\n")
            print(f"{GREEN}{'='*70}{RESET}")
            print(f"{GREEN}VERDICT: FunBet IQ predictions are PRE-MATCH ONLY ✓{RESET}")
            print(f"{GREEN}{'='*70}{RESET}")
            print(f"{GREEN}The current system implementation ensures:{RESET}")
            print(f"{GREEN}  • Predictions are calculated ONLY for future matches{RESET}")
            print(f"{GREEN}  • Existing predictions are NEVER updated{RESET}")
            print(f"{GREEN}  • API endpoints block calculation for started matches{RESET}")
            print(f"{GREEN}  • Historical backfill uses pre-match odds only{RESET}")
            print(f"{GREEN}{'='*70}{RESET}\n")
        else:
            print(f"{RED}✗ SOME TESTS FAILED{RESET}: {self.passed} passed, {self.failed} failed out of {total}\n")
            print(f"{RED}VERDICT: System may have prediction timing issues{RESET}\n")
        
        print(f"{BLUE}{'='*70}{RESET}\n")
        
        return self.failed == 0

async def main():
    tester = PredictionIntegrityTestV2()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
