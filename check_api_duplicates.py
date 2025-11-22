import asyncio
import httpx
from collections import Counter

async def check_api_for_duplicates():
    """Check if The Odds API is returning duplicate match IDs"""
    API_KEY = 'YOUR_API_KEY'  # Will be read from env in actual code
    
    # Test with one league
    test_league = 'basketball_nba'
    url = f'https://api.the-odds-api.com/v4/sports/{test_league}/odds/'
    
    params = {
        'apiKey': API_KEY,
        'regions': 'us,uk,eu,au',
        'markets': 'h2h',
        'oddsFormat': 'decimal'
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                matches = response.json()
                match_ids = [m['id'] for m in matches]
                id_counts = Counter(match_ids)
                duplicates = {mid: count for mid, count in id_counts.items() if count > 1}
                
                print(f'League: {test_league}')
                print(f'Total matches from API: {len(matches)}')
                print(f'Unique IDs: {len(set(match_ids))}')
                print(f'Duplicates in API response: {len(duplicates)}')
                
                if duplicates:
                    print('\nDuplicate IDs found in The Odds API response:')
                    for mid, count in list(duplicates.items())[:3]:
                        dup_matches = [m for m in matches if m['id'] == mid]
                        print(f'  ID: {mid}, Count: {count}')
                        print(f'    Match: {dup_matches[0]["home_team"]} vs {dup_matches[0]["away_team"]}')
                else:
                    print('✅ No duplicates in The Odds API response')
            else:
                print(f'API Error: {response.status_code}')
    except Exception as e:
        print(f'Error: {e}')

# Run check
if __name__ == '__main__':
    print('Checking The Odds API for duplicate match IDs...\n')
    # asyncio.run(check_api_for_duplicates())
    
    # Instead, let's check our database
    import os
    import sys
    sys.path.insert(0, '/app/backend')
    from pymongo import MongoClient
    
    MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    client = MongoClient(MONGO_URL)
    db = client.sportsiq
    
    # Check for duplicates in odds_cache
    pipeline = [
        {'$group': {
            '_id': '$id',
            'count': {'$sum': 1},
            'mongo_ids': {'$push': '$_id'},
            'commence_times': {'$push': '$commence_time'}
        }},
        {'$match': {'count': {'$gt': 1}}},
        {'$limit': 10}
    ]
    
    duplicates = list(db.odds_cache.aggregate(pipeline))
    print(f'Found {len(duplicates)} duplicate match IDs in odds_cache:\n')
    
    for dup in duplicates:
        print(f'Match ID: {dup["_id"]}, Count: {dup["count"]}')
        # Get sample match details
        sample = db.odds_cache.find_one({'id': dup['_id']})
        if sample:
            print(f'  Teams: {sample.get("home_team")} vs {sample.get("away_team")}')
            print(f'  Sport: {sample.get("sport_key")}')
            print(f'  Commence times: {dup["commence_times"]}')
        print()
