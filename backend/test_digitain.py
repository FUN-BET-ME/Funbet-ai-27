"""
Test script for debugging Digitain API integration
"""
import asyncio
import os
from dotenv import load_dotenv
import httpx
import msgpack
from datetime import datetime, timezone, timedelta
import json

load_dotenv()

DIGITAIN_BASE_URL = os.environ.get('DIGITAIN_BASE_URL', 'https://affiliatefeedapi.tst-digi.com')
DIGITAIN_CLIENT_ID = os.environ.get('DIGITAIN_CLIENT_ID')
DIGITAIN_CLIENT_SECRET = os.environ.get('DIGITAIN_CLIENT_SECRET')

print(f"Base URL: {DIGITAIN_BASE_URL}")
print(f"Client ID: {DIGITAIN_CLIENT_ID}")
print(f"Client Secret: {DIGITAIN_CLIENT_SECRET}")


async def test_token():
    """Test token authentication"""
    print("\n" + "="*80)
    print("TEST 1: Token Authentication")
    print("="*80)
    
    try:
        client = httpx.AsyncClient(follow_redirects=True, timeout=10.0)
        response = await client.post(
            f"{DIGITAIN_BASE_URL}/connect/token",
            content=f"client_id={DIGITAIN_CLIENT_ID}&client_secret={DIGITAIN_CLIENT_SECRET}&grant_type=client_credentials",
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        await client.aclose()
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Token obtained successfully!")
            print(f"Access Token: {data.get('access_token', '')[:50]}...")
            print(f"Expires In: {data.get('expires_in')} seconds")
            return data.get('access_token')
        else:
            print(f"❌ Failed to get token")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None


async def test_sports_list(token):
    """Test GetSports endpoint"""
    print("\n" + "="*80)
    print("TEST 2: Get Sports List")
    print("="*80)
    
    if not token:
        print("❌ No token available")
        return
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetSports",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": [1]  # 1 = English
                }
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Content Length: {len(response.content)} bytes")
            
            if response.status_code == 200:
                # Try to decode MessagePack
                print("\nAttempting MessagePack decode...")
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                
                print(f"Data Type: {type(data)}")
                
                if isinstance(data, list):
                    print(f"List Length: {len(data)}")
                    for i, item in enumerate(data[:5]):  # First 5 items
                        print(f"  Item [{i}]: {type(item)} = {str(item)[:200]}")
                elif isinstance(data, dict):
                    print(f"Dict Keys: {list(data.keys())[:10]}")
                    
                # Save to file for inspection
                with open('/app/backend/digitain_sports_response.json', 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                print("\n✅ Response saved to: /app/backend/digitain_sports_response.json")
                
                return data
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
                
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_live_events(token):
    """Test GetLiveEvents endpoint"""
    print("\n" + "="*80)
    print("TEST 3: Get Live Events")
    print("="*80)
    
    if not token:
        print("❌ No token available")
        return
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetLiveEvents",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": [1],  # 1 = English
                    "SportIds": [1, 36],  # Football, Cricket
                    "StakeTypeIds": [1]  # Result (1X2)
                }
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Content Length: {len(response.content)} bytes")
            
            if response.status_code == 200:
                # Try to decode MessagePack
                print("\nAttempting MessagePack decode...")
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                
                print(f"Data Type: {type(data)}")
                
                if isinstance(data, list):
                    print(f"List Length: {len(data)}")
                    for i, item in enumerate(data[:5]):  # First 5 items
                        print(f"  Item [{i}]: {type(item)} = {str(item)[:200]}")
                elif isinstance(data, dict):
                    print(f"Dict Keys: {list(data.keys())[:10]}")
                    
                # Save to file for inspection
                with open('/app/backend/digitain_live_response.json', 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                print("\n✅ Response saved to: /app/backend/digitain_live_response.json")
                
                return data
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
                
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_prematch_events(token):
    """Test GetPrematchEvents endpoint"""
    print("\n" + "="*80)
    print("TEST 4: Get Prematch Events")
    print("="*80)
    
    if not token:
        print("❌ No token available")
        return
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetPrematchEvents",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": [1],  # 1 = English
                    "SportIds": [1, 36],  # Football, Cricket
                    "StakeTypeIds": [1]  # Result (1X2)
                }
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Content Length: {len(response.content)} bytes")
            
            if response.status_code == 200:
                # Try to decode MessagePack
                print("\nAttempting MessagePack decode...")
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                
                print(f"Data Type: {type(data)}")
                
                if isinstance(data, list):
                    print(f"List Length: {len(data)}")
                    for i, item in enumerate(data[:5]):  # First 5 items
                        item_str = str(item)
                        if len(item_str) > 200:
                            item_str = item_str[:200] + "..."
                        print(f"  Item [{i}]: {type(item)} = {item_str}")
                elif isinstance(data, dict):
                    print(f"Dict Keys: {list(data.keys())[:10]}")
                    
                # Save to file for inspection
                with open('/app/backend/digitain_prematch_response.json', 'w') as f:
                    json.dump(data, f, indent=2, default=str)
                print("\n✅ Response saved to: /app/backend/digitain_prematch_response.json")
                
                return data
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
                
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    print("🔍 DIGITAIN API DEBUG TEST")
    print("="*80)
    
    # Test 1: Authentication
    token = await test_token()
    
    if token:
        # Test 2: Sports List
        await test_sports_list(token)
        
        # Test 3: Live Events
        await test_live_events(token)
        
        # Test 4: Prematch Events
        await test_prematch_events(token)
    
    print("\n" + "="*80)
    print("✅ All tests completed!")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
