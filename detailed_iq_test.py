#!/usr/bin/env python3
"""
Detailed FunBet IQ Sorting Test
"""

import requests
import json

BACKEND_URL = "https://predview.preview.emergentagent.com"

def test_funbet_iq_sorting_detailed():
    """Test FunBet IQ sorting in detail"""
    print("🔍 DETAILED FUNBET IQ SORTING TEST")
    print("="*60)
    
    endpoint = f"{BACKEND_URL}/api/funbet-iq/matches?limit=50"
    
    try:
        response = requests.get(endpoint, timeout=30)
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return False
            
        data = response.json()
        matches = data.get('matches', [])
        
        print(f"📊 Total matches: {len(matches)}")
        
        # Analyze confidence distribution
        confidence_counts = {'High': 0, 'Medium': 0, 'Low': 0}
        confidence_positions = {'High': [], 'Medium': [], 'Low': []}
        
        print(f"\n📋 CONFIDENCE ANALYSIS (First 20 matches):")
        print(f"{'Pos':<4} {'Confidence':<10} {'Home IQ':<8} {'Away IQ':<8} {'Home Team':<25} {'Away Team'}")
        print("-" * 80)
        
        for i, match in enumerate(matches[:20]):
            confidence = match.get('confidence', 'N/A')
            home_iq = match.get('home_iq', 0)
            away_iq = match.get('away_iq', 0)
            home_team = match.get('home_team', 'Unknown')[:24]
            away_team = match.get('away_team', 'Unknown')[:24]
            
            confidence_counts[confidence] = confidence_counts.get(confidence, 0) + 1
            confidence_positions[confidence].append(i + 1)
            
            print(f"{i+1:<4} {confidence:<10} {home_iq:<8.1f} {away_iq:<8.1f} {home_team:<25} {away_team}")
        
        print(f"\n📈 CONFIDENCE DISTRIBUTION:")
        for conf, count in confidence_counts.items():
            positions = confidence_positions[conf]
            if positions:
                print(f"{conf}: {count} matches at positions {positions}")
        
        # Check sorting correctness
        print(f"\n🔍 SORTING ANALYSIS:")
        
        # Expected order: High -> Medium -> Low
        confidence_order = {'High': 3, 'Medium': 2, 'Low': 1}
        
        # Find first occurrence of each confidence level
        first_high = next((i for i, m in enumerate(matches) if m.get('confidence') == 'High'), None)
        first_medium = next((i for i, m in enumerate(matches) if m.get('confidence') == 'Medium'), None)
        first_low = next((i for i, m in enumerate(matches) if m.get('confidence') == 'Low'), None)
        
        print(f"First High confidence at position: {first_high + 1 if first_high is not None else 'None'}")
        print(f"First Medium confidence at position: {first_medium + 1 if first_medium is not None else 'None'}")
        print(f"First Low confidence at position: {first_low + 1 if first_low is not None else 'None'}")
        
        # Check if sorting is correct
        sorting_issues = []
        
        if first_high is not None and first_medium is not None and first_high > first_medium:
            sorting_issues.append(f"High confidence appears after Medium (pos {first_high + 1} > {first_medium + 1})")
        
        if first_high is not None and first_low is not None and first_high > first_low:
            sorting_issues.append(f"High confidence appears after Low (pos {first_high + 1} > {first_low + 1})")
            
        if first_medium is not None and first_low is not None and first_medium > first_low:
            sorting_issues.append(f"Medium confidence appears after Low (pos {first_medium + 1} > {first_low + 1})")
        
        if sorting_issues:
            print(f"\n❌ SORTING ISSUES FOUND:")
            for issue in sorting_issues:
                print(f"  - {issue}")
            return False
        else:
            print(f"\n✅ SORTING IS CORRECT: High -> Medium -> Low order maintained")
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_funbet_iq_sorting_detailed()