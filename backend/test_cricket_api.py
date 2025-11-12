"""
Test script for CricketData.org API integration
Run this after upgrading to paid plan
"""

import asyncio
import json
from cricketdata_api import (
    fetch_current_matches,
    fetch_match_info,
    get_cricket_live_scores,
    get_cricket_recent_results
)


async def test_cricket_api():
    print("="*80)
    print("CRICKETDATA.ORG API TEST")
    print("="*80)
    
    # Test 1: Fetch current matches
    print("\n1. FETCHING CURRENT MATCHES...")
    print("-"*80)
    raw_matches = await fetch_current_matches()
    print(f"✅ Total matches fetched: {len(raw_matches)}")
    
    if raw_matches:
        print("\nFirst match (raw format):")
        print(json.dumps(raw_matches[0], indent=2, default=str))
        
        # Show match summary
        print("\nAll Matches Summary:")
        for i, match in enumerate(raw_matches[:10], 1):
            name = match.get('name', 'Unknown')
            status = match.get('status', 'Unknown')
            match_type = match.get('matchType', 'Unknown')
            print(f"  {i}. {name}")
            print(f"     Type: {match_type} | Status: {status}")
            
            # Show scores if available
            scores = match.get('score', [])
            if scores:
                for score in scores:
                    inning = score.get('inning', '')
                    runs = score.get('r', 0)
                    wickets = score.get('w', 0)
                    overs = score.get('o', 0)
                    print(f"     {inning}: {runs}/{wickets} ({overs} ov)")
    else:
        print("❌ No matches found")
    
    # Test 2: Convert to odds-api format
    print("\n" + "="*80)
    print("2. CONVERTING TO ODDS-API FORMAT...")
    print("-"*80)
    converted_matches = await get_cricket_live_scores()
    print(f"✅ Converted {len(converted_matches)} matches")
    
    if converted_matches:
        print("\nFirst match (converted format):")
        print(json.dumps(converted_matches[0], indent=2, default=str))
        
        # Show converted summary
        print("\nConverted Matches Summary:")
        for i, match in enumerate(converted_matches[:5], 1):
            home = match.get('home_team', 'Unknown')
            away = match.get('away_team', 'Unknown')
            status = match.get('match_status', 'Unknown')
            is_live = match.get('is_live', False)
            is_completed = match.get('completed', False)
            
            print(f"  {i}. {home} vs {away}")
            print(f"     Status: {status}")
            
            if is_live:
                print(f"     🔴 LIVE")
            if is_completed:
                print(f"     ✅ COMPLETED")
            
            scores = match.get('scores', [])
            if scores:
                for score in scores:
                    team = score.get('name', '')
                    score_val = score.get('score', '')
                    print(f"     {team}: {score_val}")
    
    # Test 3: Get recent results
    print("\n" + "="*80)
    print("3. FETCHING RECENT RESULTS (COMPLETED MATCHES)...")
    print("-"*80)
    recent_results = await get_cricket_recent_results()
    print(f"✅ Found {len(recent_results)} completed matches")
    
    if recent_results:
        print("\nRecent Results Summary:")
        for i, match in enumerate(recent_results[:5], 1):
            home = match.get('home_team', 'Unknown')
            away = match.get('away_team', 'Unknown')
            status = match.get('match_status', 'Unknown')
            
            print(f"  {i}. {home} vs {away}")
            print(f"     Result: {status}")
            
            scores = match.get('scores', [])
            if scores:
                for score in scores:
                    team = score.get('name', '')
                    score_val = score.get('score', '')
                    print(f"     {team}: {score_val}")
    
    # Test 4: Check for Australia vs India match
    print("\n" + "="*80)
    print("4. SEARCHING FOR AUSTRALIA VS INDIA MATCH...")
    print("-"*80)
    aus_ind_matches = [
        m for m in converted_matches 
        if ('australia' in m.get('home_team', '').lower() or 
            'australia' in m.get('away_team', '').lower()) and
           ('india' in m.get('home_team', '').lower() or 
            'india' in m.get('away_team', '').lower())
    ]
    
    if aus_ind_matches:
        print(f"✅ Found {len(aus_ind_matches)} Australia vs India match(es)")
        for match in aus_ind_matches:
            print(f"\n{match.get('home_team')} vs {match.get('away_team')}")
            print(f"Status: {match.get('match_status')}")
            scores = match.get('scores', [])
            for score in scores:
                print(f"{score.get('name')}: {score.get('score')}")
    else:
        print("❌ No Australia vs India match found in current data")
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETE")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(test_cricket_api())
