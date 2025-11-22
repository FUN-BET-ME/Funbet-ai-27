"""
Check The Odds API coverage for cricket leagues
Diagnose why cricket has so few matches
"""
import asyncio
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

ODDS_API_KEY = os.getenv('ODDS_API_KEY', '')
BASE_URL = 'https://api.the-odds-api.com/v4'

CRICKET_LEAGUES = [
    'cricket_test_match',
    'cricket_odi',
    'cricket_international_t20',
    'cricket_ipl',
    'cricket_big_bash',
    'cricket_caribbean_premier_league',
    'cricket_icc_world_cup',
    'cricket_psl',
]

async def check_sport(sport_key):
    """Check if The Odds API has data for a sport"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{BASE_URL}/sports/{sport_key}/odds"
            params = {
                'apiKey': ODDS_API_KEY,
                'regions': 'uk,us,eu,au',
                'markets': 'h2h'
            }
            
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                return len(data), data
            else:
                return 0, {'error': response.status_code, 'message': response.text[:200]}
                
    except Exception as e:
        return 0, {'error': str(e)}

async def main():
    print("🔍 Checking The Odds API Cricket Coverage\n")
    print("=" * 70)
    
    total_matches = 0
    
    for sport_key in CRICKET_LEAGUES:
        print(f"\n📊 {sport_key}")
        print("-" * 70)
        
        count, data = await check_sport(sport_key)
        total_matches += count
        
        if count > 0:
            print(f"✅ Found {count} matches")
            # Show sample match
            if isinstance(data, list) and len(data) > 0:
                match = data[0]
                print(f"   Sample: {match.get('home_team')} vs {match.get('away_team')}")
                print(f"   Commence: {match.get('commence_time')}")
                print(f"   Bookmakers: {len(match.get('bookmakers', []))}")
        else:
            if 'error' in data:
                print(f"❌ Error: {data.get('error')}")
                if 'message' in data:
                    print(f"   Message: {data.get('message')}")
            else:
                print(f"⚠️  No matches available")
        
        await asyncio.sleep(1)  # Rate limiting
    
    print("\n" + "=" * 70)
    print(f"\n📈 TOTAL CRICKET MATCHES: {total_matches}")
    print("\n💡 Note: The Odds API may have limited cricket coverage.")
    print("   Most cricket betting happens on specialized platforms.")
    print("   Consider these alternatives:")
    print("   1. Wait for cricket season (IPL, BBL, World Cup)")
    print("   2. Use specialized cricket betting APIs")
    print("   3. Contact The Odds API to enable more cricket sports")
    print("\n" + "=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
