#!/usr/bin/env python3
"""
FunBet.ai Backend API Testing Suite
Tests critical APIs for the review request
"""

import requests
import json
import sys
from datetime import datetime
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://sports-intel-3.preview.emergentagent.com"

def test_api_endpoint(endpoint, description, expected_fields=None):
    """Test a single API endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Endpoint: {endpoint}")
    print(f"{'='*60}")
    
    try:
        start_time = time.time()
        response = requests.get(endpoint, timeout=30)
        response_time = time.time() - start_time
        
        print(f"✅ HTTP Status: {response.status_code}")
        print(f"✅ Response Time: {response_time:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ ERROR: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
            
        # Parse JSON
        try:
            data = response.json()
            print(f"✅ Valid JSON Response")
        except json.JSONDecodeError as e:
            print(f"❌ ERROR: Invalid JSON - {e}")
            return False
        
        # Check response structure
        if isinstance(data, dict):
            print(f"✅ Response Type: Dictionary with {len(data)} keys")
            print(f"Keys: {list(data.keys())}")
            
            # Check for matches array
            if 'matches' in data:
                matches = data['matches']
                print(f"✅ Matches Array: {len(matches)} matches found")
                
                if len(matches) > 0:
                    print(f"✅ Sample Match Keys: {list(matches[0].keys())}")
                    
                    # Check expected fields if provided
                    if expected_fields:
                        sample_match = matches[0]
                        missing_fields = []
                        for field in expected_fields:
                            if field not in sample_match:
                                missing_fields.append(field)
                        
                        if missing_fields:
                            print(f"⚠️  Missing Fields: {missing_fields}")
                        else:
                            print(f"✅ All Expected Fields Present: {expected_fields}")
                else:
                    print(f"⚠️  No matches in response")
                    
        elif isinstance(data, list):
            print(f"✅ Response Type: Array with {len(data)} items")
            if len(data) > 0:
                print(f"✅ Sample Item Keys: {list(data[0].keys())}")
        else:
            print(f"⚠️  Unexpected Response Type: {type(data)}")
        
        # Print sample data (first 500 chars)
        print(f"\n📄 Sample Response:")
        print(json.dumps(data, indent=2)[:500] + "..." if len(str(data)) > 500 else json.dumps(data, indent=2))
        
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ ERROR: Request timeout (30s)")
        return False
    except requests.exceptions.ConnectionError:
        print(f"❌ ERROR: Connection failed")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_funbet_iq_sorting(matches_data):
    """Test FunBet IQ sorting logic"""
    print(f"\n{'='*60}")
    print(f"Testing: FunBet IQ Confidence Sorting")
    print(f"{'='*60}")
    
    if not matches_data or len(matches_data) == 0:
        print(f"❌ No matches data to test sorting")
        return False
    
    # Check if matches have confidence field
    confidence_levels = []
    for i, match in enumerate(matches_data[:10]):  # Check first 10
        confidence = match.get('confidence', 'N/A')
        home_iq = match.get('home_iq', 'N/A')
        away_iq = match.get('away_iq', 'N/A')
        
        confidence_levels.append(confidence)
        print(f"Match {i+1}: Confidence={confidence}, Home IQ={home_iq}, Away IQ={away_iq}")
    
    # Check sorting order (High -> Medium -> Low)
    confidence_order = {'High': 3, 'Medium': 2, 'Low': 1}
    is_sorted_correctly = True
    
    for i in range(len(confidence_levels) - 1):
        current = confidence_order.get(confidence_levels[i], 0)
        next_val = confidence_order.get(confidence_levels[i + 1], 0)
        
        if current < next_val:
            is_sorted_correctly = False
            print(f"❌ Sorting Error: Position {i+1} has {confidence_levels[i]} before {confidence_levels[i+1]}")
            break
    
    if is_sorted_correctly:
        print(f"✅ Confidence sorting is correct (High -> Medium -> Low)")
    else:
        print(f"❌ Confidence sorting is incorrect")
    
    return is_sorted_correctly

def main():
    """Run all backend API tests"""
    print(f"🧪 FunBet.ai Backend API Testing Suite")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    results = {}
    
    # Test 1: Odds API - Upcoming Matches
    endpoint1 = f"{BACKEND_URL}/api/odds/all-cached?limit=20&time_filter=upcoming"
    expected_fields1 = ['home_team', 'away_team', 'commence_time', 'odds']
    results['odds_upcoming'] = test_api_endpoint(
        endpoint1, 
        "Odds API - Upcoming Matches", 
        expected_fields1
    )
    
    # Test 2: FunBet IQ API
    endpoint2 = f"{BACKEND_URL}/api/funbet-iq/matches?limit=20"
    expected_fields2 = ['confidence', 'home_iq', 'away_iq']
    results['funbet_iq'] = test_api_endpoint(
        endpoint2, 
        "FunBet IQ API", 
        expected_fields2
    )
    
    # Get FunBet IQ data for sorting test
    try:
        iq_response = requests.get(endpoint2, timeout=30)
        if iq_response.status_code == 200:
            iq_data = iq_response.json()
            matches_for_sorting = iq_data.get('matches', []) if isinstance(iq_data, dict) else iq_data
            results['funbet_iq_sorting'] = test_funbet_iq_sorting(matches_for_sorting)
        else:
            results['funbet_iq_sorting'] = False
    except:
        results['funbet_iq_sorting'] = False
    
    # Test 3: Live Scores API
    endpoint3 = f"{BACKEND_URL}/api/scores/live"
    expected_fields3 = ['live_scores', 'completed_scores']
    results['live_scores'] = test_api_endpoint(
        endpoint3, 
        "Live Scores API", 
        expected_fields3
    )
    
    # Summary
    print(f"\n{'='*60}")
    print(f"🏁 TEST SUMMARY")
    print(f"{'='*60}")
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print(f"🎉 All tests passed!")
        return True
    else:
        print(f"⚠️  Some tests failed - see details above")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)