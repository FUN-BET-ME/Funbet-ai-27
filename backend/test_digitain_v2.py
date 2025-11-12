"""
Test script v2 for Digitain API integration with conversion
"""
import asyncio
from digitain_api import fetch_live_events, fetch_prematch_events, convert_to_odds_api_format
import json


async def test_live_with_conversion():
    """Test live events with conversion to odds API format"""
    print("\n" + "="*80)
    print("TEST: Fetch Live Events and Convert")
    print("="*80)
    
    # Fetch live events
    events = await fetch_live_events()
    
    print(f"\n✅ Fetched {len(events)} live events from Digitain")
    
    if events:
        # Show first event raw structure
        print(f"\nFirst Event Raw Structure (array length: {len(events[0])}):")
        for i, item in enumerate(events[0][:15]):  # First 15 items
            print(f"  [{i}]: {type(item).__name__} = {str(item)[:100]}")
        
        # Convert to odds API format
        converted = convert_to_odds_api_format(events)
        
        print(f"\n✅ Converted {len(converted)} events to odds API format")
        
        if converted:
            # Show first converted event
            print("\nFirst Converted Event:")
            print(json.dumps(converted[0], indent=2, default=str))
            
            # Save all converted events
            with open('/app/backend/digitain_converted_live.json', 'w') as f:
                json.dump(converted, f, indent=2, default=str)
            print("\n✅ All converted events saved to: /app/backend/digitain_converted_live.json")
        
        return converted
    else:
        print("❌ No events fetched")
        return []


async def test_prematch_with_conversion():
    """Test prematch events with conversion to odds API format"""
    print("\n" + "="*80)
    print("TEST: Fetch Prematch Events and Convert")
    print("="*80)
    
    # Fetch prematch events (7 days ahead)
    events = await fetch_prematch_events(days_ahead=7)
    
    print(f"\n✅ Fetched {len(events)} prematch events from Digitain")
    
    if events:
        # Show first event raw structure
        print(f"\nFirst Event Raw Structure (array length: {len(events[0])}):")
        for i, item in enumerate(events[0][:15]):  # First 15 items
            print(f"  [{i}]: {type(item).__name__} = {str(item)[:100]}")
        
        # Convert to odds API format
        converted = convert_to_odds_api_format(events)
        
        print(f"\n✅ Converted {len(converted)} events to odds API format")
        
        if converted:
            # Show first converted event
            print("\nFirst Converted Event:")
            print(json.dumps(converted[0], indent=2, default=str))
            
            # Save all converted events
            with open('/app/backend/digitain_converted_prematch.json', 'w') as f:
                json.dump(converted, f, indent=2, default=str)
            print("\n✅ All converted events saved to: /app/backend/digitain_converted_prematch.json")
        
        return converted
    else:
        print("❌ No events fetched")
        return []


async def main():
    print("🔍 DIGITAIN API TEST V2 - WITH CONVERSION")
    print("="*80)
    
    # Test live events
    live_converted = await test_live_with_conversion()
    
    # Test prematch events
    prematch_converted = await test_prematch_with_conversion()
    
    print("\n" + "="*80)
    print(f"✅ SUMMARY:")
    print(f"   Live Events: {len(live_converted)}")
    print(f"   Prematch Events: {len(prematch_converted)}")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
