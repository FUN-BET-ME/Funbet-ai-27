"""
FunBet Odds Generator
Automatically generates FunBet odds at 5% above the best market odds
"""
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

def find_best_odds(bookmakers: List[Dict], home_team: str, away_team: str) -> Dict[str, float]:
    """
    Find the best odds for each outcome across all bookmakers by matching team names
    
    Args:
        bookmakers: List of bookmaker dictionaries
        home_team: Name of the home team
        away_team: Name of the away team
    
    Returns:
        {
            'home': best_home_odds,
            'away': best_away_odds,
            'draw': best_draw_odds (if applicable)
        }
    """
    best_odds = {
        'home': 0.0,
        'away': 0.0,
        'draw': 0.0
    }
    
    for bookmaker in bookmakers:
        markets = bookmaker.get('markets', [])
        for market in markets:
            if market.get('key') == 'h2h':
                outcomes = market.get('outcomes', [])
                for outcome in outcomes:
                    name = outcome.get('name', '').strip()
                    price = outcome.get('price', 0)
                    
                    # Match by team name (case-insensitive)
                    if name.lower() == home_team.lower():
                        best_odds['home'] = max(best_odds['home'], price)
                    elif name.lower() == away_team.lower():
                        best_odds['away'] = max(best_odds['away'], price)
                    elif 'draw' in name.lower() or 'tie' in name.lower():
                        best_odds['draw'] = max(best_odds['draw'], price)
    
    return best_odds

def calculate_funbet_odds(best_odds: Dict[str, float], markup_percent: float = 5.0) -> Dict[str, float]:
    """
    Calculate FunBet odds with markup above market best
    
    Args:
        best_odds: Dictionary with best market odds
        markup_percent: Markup percentage (default 5%)
    
    Returns:
        Dictionary with FunBet odds
    """
    markup_multiplier = 1 + (markup_percent / 100)
    
    funbet_odds = {}
    for outcome, odds in best_odds.items():
        if odds > 0:
            # Apply markup
            funbet_odds[outcome] = round(odds * markup_multiplier, 2)
    
    return funbet_odds

def generate_funbet_bookmaker(match: Dict, home_team: str, away_team: str) -> Dict:
    """
    Generate FunBet bookmaker entry for a match
    
    Args:
        match: Match data with existing bookmakers
        home_team: Home team name
        away_team: Away team name
    
    Returns:
        FunBet bookmaker dictionary
    """
    try:
        existing_bookmakers = match.get('bookmakers', [])
        
        if not existing_bookmakers:
            logger.warning(f"No bookmakers found for {home_team} vs {away_team}")
            return None
        
        # Find best market odds (match by team name)
        best_odds = find_best_odds(existing_bookmakers, home_team, away_team)
        
        # Calculate FunBet odds (5% above market best)
        funbet_odds = calculate_funbet_odds(best_odds, markup_percent=5.0)
        
        # Build FunBet bookmaker entry
        outcomes = []
        
        if funbet_odds.get('home', 0) > 0:
            outcomes.append({
                'name': home_team,
                'price': funbet_odds['home']
            })
        
        if funbet_odds.get('away', 0) > 0:
            outcomes.append({
                'name': away_team,
                'price': funbet_odds['away']
            })
        
        if funbet_odds.get('draw', 0) > 0:
            outcomes.append({
                'name': 'Draw',
                'price': funbet_odds['draw']
            })
        
        if not outcomes:
            logger.warning(f"Could not generate FunBet odds for {home_team} vs {away_team}")
            return None
        
        funbet_bookmaker = {
            'key': 'funbet',
            'title': 'FunBet.me',
            'last_update': match.get('commence_time'),  # Use match time as update time
            'markets': [{
                'key': 'h2h',
                'last_update': match.get('commence_time'),
                'outcomes': outcomes
            }]
        }
        
        logger.debug(f"Generated FunBet odds for {home_team} vs {away_team}: {funbet_odds}")
        return funbet_bookmaker
        
    except Exception as e:
        logger.error(f"Error generating FunBet odds: {e}")
        return None

def add_funbet_odds_to_matches(matches: List[Dict]) -> List[Dict]:
    """
    Add FunBet bookmaker to all matches
    
    Args:
        matches: List of match dictionaries
    
    Returns:
        List of matches with FunBet bookmaker added
    """
    enhanced_matches = []
    funbet_added = 0
    
    for match in matches:
        try:
            home_team = match.get('home_team', '')
            away_team = match.get('away_team', '')
            
            # Generate FunBet bookmaker
            funbet_bookmaker = generate_funbet_bookmaker(match, home_team, away_team)
            
            if funbet_bookmaker:
                # Check if FunBet already exists
                bookmakers = match.get('bookmakers', [])
                funbet_exists = any(bm.get('key') == 'funbet' for bm in bookmakers)
                
                if not funbet_exists:
                    # Add FunBet as first bookmaker (featured position)
                    match['bookmakers'].insert(0, funbet_bookmaker)
                    funbet_added += 1
            
            enhanced_matches.append(match)
            
        except Exception as e:
            logger.error(f"Error processing match: {e}")
            enhanced_matches.append(match)  # Add match anyway without FunBet odds
    
    logger.info(f"✅ FunBet odds added to {funbet_added}/{len(matches)} matches")
    return enhanced_matches
