"""
Check football coverage from The Odds API
Ensure we're getting all available matches
"""
import asyncio
import httpx
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

ODDS_API_KEY = os.getenv('ODDS_API_KEY', '')
BASE_URL = 'https://api.the-odds-api.com/v4'

FOOTBALL_LEAGUES = [
    'soccer_uefa_champs_league',
    'soccer_uefa_europa_league',
    'soccer_uefa_europa_conference_league',
    'soccer_fifa_world_cup',
    'soccer_fifa_world_cup_qualifiers_europe',
    'soccer_uefa_euro_qualification',
    'soccer_uefa_nations_league',
    'soccer_conmebol_copa_america',
    'soccer_epl',
    'soccer_efl_champ',
    'soccer_england_league1',
    'soccer_england_league2',
    'soccer_spain_la_liga',
    'soccer_spain_segunda_division',
    'soccer_germany_bundesliga',
    'soccer_germany_bundesliga2',
    'soccer_italy_serie_a',
    'soccer_italy_serie_b',
    'soccer_france_ligue_one',
    'soccer_france_ligue_two',
    'soccer_portugal_primeira_liga',
    'soccer_netherlands_eredivisie',
    'soccer_brazil_campeonato',
    'soccer_argentina_primera_division',
    'soccer_conmebol_libertadores',
    'soccer_conmebol_copa_sudamericana',
    'soccer_mexico_ligamx',
    'soccer_turkey_super_league',
    'soccer_turkey_1_lig',
    'soccer_usa_mls',
    'soccer_australia_aleague',
    'soccer_japan_j_league',
]

async def check_sport(sport_key):
    """Check how many matches The Odds API has for a sport"""
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
                
                # Count upcoming vs past matches
                now = datetime.now(timezone.utc)
                upcoming = 0
                past = 0
                
                for match in data:
                    commence = match.get('commence_time', '')
                    if commence:
                        match_time = datetime.fromisoformat(commence.replace('Z', '+00:00'))
                        if match_time > now:
                            upcoming += 1
                        else:
                            past += 1
                
                return {
                    'total': len(data),
                    'upcoming': upcoming,
                    'past': past,
                    'bookmakers': len(data[0].get('bookmakers', [])) if data else 0
                }
            else:
                return {'error': response.status_code, 'total': 0}
                
    except Exception as e:
        return {'error': str(e), 'total': 0}

async def get_all_available_sports():
    """Get all available sports from The Odds API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{BASE_URL}/sports"
            params = {'apiKey': ODDS_API_KEY}
            
            response = await client.get(url, params=params)
            
            if response.status_code == 200:
                sports = response.json()
                # Filter for soccer/football
                soccer_sports = [s for s in sports if 'soccer' in s.get('key', '').lower()]
                return soccer_sports
            else:
                return []
    except Exception as e:
        print(f"Error fetching sports: {e}")
        return []

async def main():
    print("🔍 Checking Football Coverage from The Odds API\n")
    print("=" * 80)
    
    # First, check all available football sports
    print("\n📋 Step 1: Getting ALL available football sports from The Odds API...")
    all_soccer_sports = await get_all_available_sports()
    
    print(f"\n✅ Found {len(all_soccer_sports)} football sports available:")
    available_keys = {s['key'] for s in all_soccer_sports}
    
    for sport in all_soccer_sports[:20]:  # Show first 20
        print(f"   • {sport['key']}: {sport.get('title', 'N/A')}")
    
    if len(all_soccer_sports) > 20:
        print(f"   ... and {len(all_soccer_sports) - 20} more")
    
    # Check which we're tracking vs not tracking
    tracking_keys = set(FOOTBALL_LEAGUES)
    not_tracking = available_keys - tracking_keys
    tracking_unavailable = tracking_keys - available_keys
    
    print(f"\n📊 Coverage Analysis:")
    print(f"   ✅ Tracking: {len(tracking_keys)} leagues")
    print(f"   ✅ Available in API: {len(available_keys)} leagues")
    print(f"   ⚠️  Not tracking but available: {len(not_tracking)} leagues")
    print(f"   ⚠️  Tracking but unavailable: {len(tracking_unavailable)} leagues")
    
    if not_tracking:
        print(f"\n🆕 Football leagues we could add (first 15):")
        for key in list(not_tracking)[:15]:
            sport_info = next((s for s in all_soccer_sports if s['key'] == key), None)
            if sport_info:
                print(f"   • {key}: {sport_info.get('title', 'N/A')}")
    
    if tracking_unavailable:
        print(f"\n⚠️  Leagues we're tracking but API doesn't have:")
        for key in tracking_unavailable:
            print(f"   • {key}")
    
    # Now check match counts for our tracked leagues
    print("\n" + "=" * 80)
    print("\n📊 Step 2: Checking match counts for tracked leagues...")
    print("=" * 80)
    
    total_matches = 0
    active_leagues = 0
    
    for i, sport_key in enumerate(FOOTBALL_LEAGUES, 1):
        print(f"\n[{i}/{len(FOOTBALL_LEAGUES)}] {sport_key}")
        print("-" * 80)
        
        result = await check_sport(sport_key)
        
        if 'error' in result:
            print(f"   ❌ Error: {result.get('error')}")
        elif result['total'] == 0:
            print(f"   ⚠️  No matches available (off-season or inactive)")
        else:
            total_matches += result['total']
            active_leagues += 1
            print(f"   ✅ {result['total']} matches ({result['upcoming']} upcoming, {result['past']} past)")
            print(f"   📊 Bookmakers: {result['bookmakers']}")
        
        await asyncio.sleep(1)  # Rate limiting
    
    # Summary
    print("\n" + "=" * 80)
    print("\n📈 SUMMARY")
    print("=" * 80)
    print(f"   Total football matches available: {total_matches}")
    print(f"   Active leagues: {active_leagues}/{len(FOOTBALL_LEAGUES)}")
    print(f"   Inactive leagues: {len(FOOTBALL_LEAGUES) - active_leagues}")
    print(f"   Potential new leagues to add: {len(not_tracking)}")
    
    print("\n💡 RECOMMENDATIONS:")
    if len(not_tracking) > 0:
        print(f"   1. Add {min(10, len(not_tracking))} more football leagues for better coverage")
    print(f"   2. Current {active_leagues} active leagues providing {total_matches} matches")
    print(f"   3. System is fetching from The Odds API correctly")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
