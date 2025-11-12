"""
Import existing team logos from frontend to backend database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re

# Extract logos from frontend teamLogos.js
FRONTEND_LOGOS = {
    'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    'Aston Villa': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Aston_Villa_logo.svg/240px-Aston_Villa_logo.svg.png',
    'Bournemouth': 'https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg',
    'Brentford': 'https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg',
    'Brighton & Hove Albion': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
    'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    'Crystal Palace': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Crystal_Palace_FC_logo.svg',
    'Everton': 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
    'Fulham': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg',
    'Leeds United': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'Leicester City': 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg',
    'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    'Newcastle United': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
    'Nottingham Forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg',
    'Southampton': 'https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg',
    'Tottenham Hotspur': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'West Ham United': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
    'Wolverhampton Wanderers': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
}

async def parse_frontend_logos():
    """Parse all logos from frontend file"""
    logos = {}
    
    with open('/app/frontend/src/services/teamLogos.js', 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Find the teamLogos object
        pattern = r"'([^']+)':\s*'(https?://[^']+)'"
        matches = re.findall(pattern, content)
        
        for team_name, logo_url in matches:
            if 'wikipedia' in logo_url or 'wikimedia' in logo_url or 'upload' in logo_url:
                logos[team_name] = logo_url
    
    return logos

async def import_logos():
    print("🔄 Importing logos from frontend to backend database...")
    
    # Parse logos from frontend
    logos = await parse_frontend_logos()
    print(f"📊 Found {len(logos)} logos in frontend")
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client['test_database']
    
    # Import logos
    imported = 0
    updated = 0
    
    for team_name, logo_url in logos.items():
        existing = await db.team_logos.find_one({'team_name': team_name})
        
        if existing:
            # Update if it's currently a text fallback
            if 'ui-avatars' in existing.get('logo_url', ''):
                await db.team_logos.update_one(
                    {'team_name': team_name},
                    {'$set': {'logo_url': logo_url, 'source': 'frontend_import'}}
                )
                updated += 1
        else:
            # Insert new
            await db.team_logos.insert_one({
                'team_name': team_name,
                'logo_url': logo_url,
                'source': 'frontend_import',
                'fetched_at': '2024-11-11T00:00:00Z'
            })
            imported += 1
    
    client.close()
    
    print(f"✅ Import complete!")
    print(f"  - Imported: {imported} new logos")
    print(f"  - Updated: {updated} existing fallbacks")
    print(f"  - Total: {imported + updated} logos")

if __name__ == '__main__':
    asyncio.run(import_logos())
