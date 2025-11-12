"""
Test different date formats for prematch events
"""
import asyncio
import os
from dotenv import load_dotenv
import httpx
import msgpack
from datetime import datetime, timezone, timedelta

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


async def test_date_format(token, start_date, end_date, format_name):
    """Test a specific date format"""
    print(f"\nTesting {format_name}:")
    print(f"  StartDate: {start_date}")
    print(f"  EndDate: {end_date}")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetPrematchEvents",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": [1],
                    "SportIds": [1],
                    "StakeTypeIds": [1],
                    "StartDate": start_date,
                    "EndDate": end_date
                }
            )
            
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                is_successful = data[2] if len(data) > 2 else False
                events = data[0] if data[0] else []
                error = data[1] if len(data) > 1 else None
                
                print(f"  IsSuccessful: {is_successful}")
                print(f"  Events Count: {len(events) if isinstance(events, list) else 0}")
                if error:
                    print(f"  Error: {error}")
                
                return is_successful
            else:
                print(f"  Failed: {response.text[:200]}")
                return False
                
    except Exception as e:
        print(f"  Exception: {e}")
        return False


async def main():
    print("="*80)
    print("TESTING PREMATCH DATE FORMATS")
    print("="*80)
    
    token = await get_token()
    if not token:
        print("❌ Failed to get token")
        return
    
    now = datetime.now(timezone.utc)
    future = now + timedelta(days=7)
    
    # Format 1: ISO format with timezone
    await test_date_format(token, now.isoformat(), future.isoformat(), "ISO 8601 with timezone")
    
    # Format 2: ISO format without microseconds
    await test_date_format(
        token, 
        now.strftime("%Y-%m-%dT%H:%M:%SZ"), 
        future.strftime("%Y-%m-%dT%H:%M:%SZ"), 
        "ISO 8601 with Z"
    )
    
    # Format 3: Date only
    await test_date_format(
        token, 
        now.strftime("%Y-%m-%d"), 
        future.strftime("%Y-%m-%d"), 
        "Date only (YYYY-MM-DD)"
    )
    
    # Format 4: Milliseconds timestamp
    await test_date_format(
        token, 
        str(int(now.timestamp() * 1000)), 
        str(int(future.timestamp() * 1000)), 
        "Milliseconds timestamp"
    )
    
    # Format 5: Seconds timestamp
    await test_date_format(
        token, 
        str(int(now.timestamp())), 
        str(int(future.timestamp())), 
        "Seconds timestamp"
    )
    
    # Format 6: No dates at all (see what happens)
    print(f"\nTesting without dates:")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetPrematchEvents",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                json={
                    "LangIds": [1],
                    "SportIds": [1],
                    "StakeTypeIds": [1]
                }
            )
            
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                is_successful = data[2] if len(data) > 2 else False
                events = data[0] if data[0] else []
                error = data[1] if len(data) > 1 else None
                
                print(f"  IsSuccessful: {is_successful}")
                print(f"  Events Count: {len(events) if isinstance(events, list) else 0}")
                if error:
                    print(f"  Error: {error}")
    except Exception as e:
        print(f"  Exception: {e}")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    asyncio.run(main())
