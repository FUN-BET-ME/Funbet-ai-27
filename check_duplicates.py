import os
import sys
sys.path.insert(0, '/app/backend')
from pymongo import MongoClient

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.sportsiq

# Find duplicates by match_id
pipeline = [
    {'$group': {
        '_id': '$match_id',
        'count': {'$sum': 1},
        'doc_ids': {'$push': '$_id'}
    }},
    {'$match': {'count': {'$gt': 1}}},
    {'$sort': {'count': -1}},
    {'$limit': 20}
]

duplicates = list(db.odds_cache.aggregate(pipeline))
print(f'\n========== DUPLICATE ANALYSIS ==========')
print(f'Found {len(duplicates)} duplicate match_ids:\n')

for dup in duplicates:
    print(f'match_id: {dup["_id"]}, count: {dup["count"]}')
    # Get sample match details
    docs = list(db.odds_cache.find({'match_id': dup['_id']}).limit(2))
    if docs:
        print(f'  Teams: {docs[0].get("home_team")} vs {docs[0].get("away_team")}')
        print(f'  Sport: {docs[0].get("sport_key")}')
        print(f'  MongoDB _id values:')
        for doc in docs:
            print(f'    - {doc["_id"]}')
    print()

print(f'Total docs in odds_cache: {db.odds_cache.count_documents({})}')

# Check if there's a Draw outcome for basketball
print(f'\n========== BASKETBALL DRAW ISSUE CHECK ==========')
basketball_matches = list(db.odds_cache.find({'sport_key': {'$regex': '^basketball'}}).limit(5))
for match in basketball_matches:
    print(f'{match["home_team"]} vs {match["away_team"]}')
    if match.get('bookmakers'):
        for bm in match['bookmakers'][:1]:  # Check first bookmaker
            if bm.get('markets') and bm['markets'][0].get('outcomes'):
                outcomes = bm['markets'][0]['outcomes']
                print(f'  Bookmaker: {bm.get("title")}, Outcomes: {len(outcomes)}')
                for outcome in outcomes:
                    print(f'    - {outcome.get("name")}: {outcome.get("price")}')
    print()
