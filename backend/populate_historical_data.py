"""
Manual script to populate historical data for FunBet IQ
Fetches team stats and H2H records from API-Football, API-Basketball, Cricket API
"""
import asyncio
import sys
from historical_data_builder import HistoricalDataBuilder

GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

async def main():
    print(f"{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}FunBet IQ - Historical Data Population{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")
    
    builder = HistoricalDataBuilder()
    await builder.connect_db()
    
    print(f"{YELLOW}Step 1: Populating team stats...{RESET}")
    result1 = await builder.populate_team_stats_for_upcoming_matches(limit=100)
    print(f"{GREEN}✓ Processed {result1['teams_processed']} teams")
    print(f"{GREEN}✓ Added {result1['stats_added']} team stats{RESET}\n")
    
    print(f"{YELLOW}Step 2: Populating H2H records...{RESET}")
    result2 = await builder.populate_h2h_for_upcoming_matches(limit=100)
    print(f"{GREEN}✓ Added {result2['h2h_added']} H2H records{RESET}\n")
    
    print(f"{GREEN}{'='*70}{RESET}")
    print(f"{GREEN}Historical data population complete!{RESET}")
    print(f"{GREEN}{'='*70}{RESET}\n")
    
    print(f"{YELLOW}Note: This process uses API calls and may take some time.{RESET}")
    print(f"{YELLOW}Run this periodically to keep historical data updated.{RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
