"""
Test different language IDs to find English
"""
import asyncio
import os
from dotenv import load_dotenv
import httpx
import msgpack

load_dotenv()

DIGITAIN_BASE_URL = os.environ.get('DIGITAIN_BASE_URL')
DIGITAIN_CLIENT_ID = os.environ.get('DIGITAIN_CLIENT_ID')
DIGITAIN_CLIENT_SECRET = os.environ.get('DIGITAIN_CLIENT_SECRET')


async def get_token():
    client = httpx.AsyncClient(follow_redirects=True, timeout=10.0)
    response = await client.post(
        f"{DIGITAIN_BASE_URL}/connect/token",
        content=f"client_id={DIGITAIN_CLIENT_ID}&client_secret={DIGITAIN_CLIENT_SECRET}&grant_type=client_credentials",
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    await client.aclose()
    
    if response.status_code == 200:
        return response.json().get('access_token')
    return None


async def test_language(token, lang_ids):
    """Test a specific language ID"""
    print(f"\nTesting LangIds: {lang_ids}")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetLiveEvents",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": lang_ids,
                    "SportIds": [1],  # Football
                    "StakeTypeIds": [1]
                }
            )
            
            if response.status_code == 200:
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                is_successful = data[2] if len(data) > 2 else False
                events = data[0] if data[0] else []
                
                if is_successful and events and len(events) > 0:
                    event = events[0]
                    home_team_dict = event[2] if len(event) > 2 else {}
                    away_team_dict = event[3] if len(event) > 3 else {}
                    
                    print(f"  Success! Got {len(events)} events")
                    print(f"  Home team dict: {home_team_dict}")
                    print(f"  Away team dict: {away_team_dict}")
                    
                    # Show all available language keys
                    if isinstance(home_team_dict, dict):
                        print(f"  Available lang keys: {list(home_team_dict.keys())}")
                else:
                    print(f"  No events or not successful")
            else:
                print(f"  Failed: Status {response.status_code}")
                
    except Exception as e:
        print(f"  Exception: {e}")


async def main():
    print("="*80)
    print("TESTING LANGUAGE IDs FOR ENGLISH TEAM NAMES")
    print("="*80)
    
    token = await get_token()
    if not token:
        print("❌ Failed to get token")
        return
    
    # Test individual language IDs
    for lang_id in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
        await test_language(token, [lang_id])
    
    # Test multiple language IDs at once
    await test_language(token, [1, 2, 3])
    
    print("\n" + "="*80)


if __name__ == "__main__":
    asyncio.run(main())
