"""
FunBet IQ V4 - AI-Powered Multi-Factor Analysis

Architecture:
- Odds Analysis (20%): Market odds, implied probabilities, bookmaker consensus
- Volume Analysis (20%): Betting volume, number of bookmakers, market liquidity
- Odds Movement (20%): How odds have changed leading up to match
- Team Stats (20%): Win/loss record, goals, recent performance
- Momentum (10%): Past 10 games scoring system (home win +3, draw +2, away win +5, unbeaten +2/game, draw +1)
- Head to Head (10%): Historical results between these specific teams

Final Formula:
FunBet IQ = 0.20 * Odds_IQ + 0.20 * Volume_IQ + 0.20 * Movement_IQ + 0.20 * Team_Stats_IQ + 0.10 * Momentum_IQ + 0.10 * H2H_IQ
Scaled to 0-100
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import statistics

logger = logging.getLogger(__name__)


# ==================== MARKET IQ COMPONENT (40%) ====================

def calculate_odds_iq(match: Dict, team_type: str = 'home') -> float:
    """
    Calculate Odds Analysis IQ (20% weight)
    
    Based on market odds and implied probabilities from bookmakers
    
    Args:
        match: Match data with bookmakers
        team_type: 'home' or 'away'
    
    Returns:
        Odds IQ score (0-100)
    """
    try:
        bookmakers = match.get('bookmakers', [])
        if not bookmakers:
            return 50.0  # Neutral baseline
        
        # Extract odds for the team
        team_odds = []
        for bookie in bookmakers:
            markets = bookie.get('markets', [])
            if markets:
                outcomes = markets[0].get('outcomes', [])
                for outcome in outcomes:
                    name = outcome.get('name', '').lower()
                    price = outcome.get('price', 0)
                    
                    if team_type == 'home':
                        if match.get('home_team', '').lower() in name or name == 'home' or name == '1':
                            team_odds.append(price)
                    else:  # away
                        if match.get('away_team', '').lower() in name or name == 'away' or name == '2':
                            team_odds.append(price)
        
        if not team_odds:
            return 50.0
        
        # Calculate market metrics
        best_odds = max(team_odds)  # Best price available
        avg_odds = statistics.mean(team_odds)
        
        # Market implied probability (CORE SIGNAL)
        # Lower odds = higher probability = FAVORITE
        # Examples: 1.50 odds = 66.7% prob, 3.00 odds = 33.3% prob
        market_implied_prob = 1 / avg_odds if avg_odds > 0 else 0
        
        # Convert probability to IQ score (0-100 scale)
        # Probability ranges: 0.10 (10%) to 0.90 (90%)
        # Scale to IQ: 10% prob = 10 IQ, 90% prob = 90 IQ
        base_market_iq = market_implied_prob * 100
        
        # Bonus adjustments (up to +10 points total)
        
        # 1. Best odds bonus: reward teams with better prices available (+0 to +5)
        # Higher best_odds relative to average = better value
        odds_value_bonus = 0
        if avg_odds > 0:
            odds_value_ratio = (best_odds - avg_odds) / avg_odds
            odds_value_bonus = min(odds_value_ratio * 10, 5.0)  # Cap at +5
        
        # 2. Market certainty bonus: low variance = market agreement (+0 to +5)
        # Low variance means bookmakers agree on the price = more confident prediction
        certainty_bonus = 0
        if len(team_odds) > 1:
            odds_variance = statistics.variance(team_odds)
            # Invert variance: low variance = high certainty
            certainty_score = max(0, 1 - (odds_variance / 0.5))
            certainty_bonus = certainty_score * 5  # Up to +5 for very low variance
        
        # Calculate final Odds IQ
        odds_iq = base_market_iq + odds_value_bonus + certainty_bonus
        
        # Clamp to 0-100
        odds_iq = max(0, min(100, odds_iq))
        
        logger.debug(f"Odds IQ for {team_type}: {odds_iq:.2f} (prob={market_implied_prob:.3f}, base={base_market_iq:.1f}, value_bonus={odds_value_bonus:.1f}, certainty_bonus={certainty_bonus:.1f}, avg_odds={avg_odds:.2f})")
        
        return odds_iq
        
    except Exception as e:
        logger.error(f"Error calculating Market IQ: {e}")
        return 50.0


def calculate_volume_iq(match: Dict, team_type: str = 'home') -> float:
    """
    Calculate Volume Analysis IQ (20% weight)
    
    Based on betting volume, number of bookmakers, and market liquidity
    
    Args:
        match: Match data with bookmakers
        team_type: 'home' or 'away'
    
    Returns:
        Volume IQ score (0-100)
    """
    try:
        bookmakers = match.get('bookmakers', [])
        if not bookmakers:
            return 50.0  # Neutral baseline
        
        # 1. Number of bookmakers (market participation)
        num_bookmakers = len(bookmakers)
        
        # Score based on bookmaker count (more bookmakers = more confident market)
        # 1-3 bookmakers: Low (40-60)
        # 4-7 bookmakers: Medium (60-80)
        # 8+ bookmakers: High (80-100)
        if num_bookmakers >= 8:
            bookmaker_score = 90.0
        elif num_bookmakers >= 4:
            bookmaker_score = 60.0 + (num_bookmakers - 4) * 5.0
        else:
            bookmaker_score = 40.0 + num_bookmakers * 6.67
        
        # 2. Market consensus (how much bookmakers agree)
        team_odds = []
        for bookie in bookmakers:
            markets = bookie.get('markets', [])
            if markets:
                outcomes = markets[0].get('outcomes', [])
                for outcome in outcomes:
                    name = outcome.get('name', '').lower()
                    price = outcome.get('price', 0)
                    
                    if team_type == 'home':
                        if match.get('home_team', '').lower() in name or name == 'home' or name == '1':
                            team_odds.append(price)
                    else:
                        if match.get('away_team', '').lower() in name or name == 'away' or name == '2':
                            team_odds.append(price)
        
        if not team_odds:
            return 50.0
        
        # Calculate market consensus (low variance = high confidence)
        consensus_score = 50.0
        if len(team_odds) > 1:
            odds_variance = statistics.variance(team_odds)
            # Lower variance = higher market confidence
            # High variance (>0.5) = 40, Low variance (<0.1) = 60
            consensus_score = 60.0 - min(odds_variance * 40, 20.0)
        
        # 3. Market implied probability (shows favorite vs underdog)
        avg_odds = statistics.mean(team_odds)
        market_prob = 1 / avg_odds if avg_odds > 0 else 0
        prob_score = market_prob * 100
        
        # Combine scores: 40% bookmakers, 30% consensus, 30% probability
        volume_iq = (0.40 * bookmaker_score + 0.30 * consensus_score + 0.30 * prob_score)
        
        # Clamp to 0-100
        volume_iq = max(0, min(100, volume_iq))
        
        logger.debug(f"Volume IQ for {team_type}: {volume_iq:.2f} (bookmakers={num_bookmakers}, consensus={consensus_score:.1f}, prob={prob_score:.1f})")
        
        return volume_iq
        
    except Exception as e:
        logger.error(f"Error calculating Volume IQ: {e}")
        return 50.0


def calculate_movement_iq(match: Dict, team_type: str = 'home') -> float:
    """
    Calculate Odds Movement IQ (20% weight)
    
    Based on how odds have changed leading up to the match
    Note: Without historical odds data, we use bookmaker spread as proxy for movement
    
    Args:
        match: Match data with bookmakers
        team_type: 'home' or 'away'
    
    Returns:
        Movement IQ score (0-100)
    """
    try:
        bookmakers = match.get('bookmakers', [])
        if not bookmakers:
            return 50.0
        
        # Extract odds for the team
        team_odds = []
        for bookie in bookmakers:
            markets = bookie.get('markets', [])
            if markets:
                outcomes = markets[0].get('outcomes', [])
                for outcome in outcomes:
                    name = outcome.get('name', '').lower()
                    price = outcome.get('price', 0)
                    
                    if team_type == 'home':
                        if match.get('home_team', '').lower() in name or name == 'home' or name == '1':
                            team_odds.append(price)
                    else:
                        if match.get('away_team', '').lower() in name or name == 'away' or name == '2':
                            team_odds.append(price)
        
        if len(team_odds) < 2:
            return 50.0
        
        # Use odds spread as proxy for movement
        # Best odds vs worst odds indicates market direction
        best_odds = max(team_odds)
        worst_odds = min(team_odds)
        avg_odds = statistics.mean(team_odds)
        
        # Calculate spread percentage
        odds_spread = (best_odds - worst_odds) / avg_odds if avg_odds > 0 else 0
        
        # Odds spread interpretation:
        # Low spread (<5%): Stable market, strong consensus
        # Medium spread (5-15%): Normal movement
        # High spread (>15%): Active movement, uncertainty
        
        # Convert to IQ score based on team's position
        # If team has better odds (lower price), they're favored more
        market_prob = 1 / avg_odds if avg_odds > 0 else 0
        base_score = market_prob * 100
        
        # Adjust for spread (tight spread = more confident)
        if odds_spread < 0.05:
            spread_bonus = 10.0  # Tight market = high confidence
        elif odds_spread < 0.15:
            spread_bonus = 5.0   # Normal
        else:
            spread_bonus = -5.0  # Wide spread = uncertainty
        
        movement_iq = base_score + spread_bonus
        
        # Clamp to 0-100
        movement_iq = max(0, min(100, movement_iq))
        
        logger.debug(f"Movement IQ for {team_type}: {movement_iq:.2f} (spread={odds_spread:.3f}, avg_odds={avg_odds:.2f})")
        
        return movement_iq
        
    except Exception as e:
        logger.error(f"Error calculating Movement IQ: {e}")
        return 50.0


def calculate_draw_iq(match: Dict) -> float:
    """
    Calculate Draw IQ for football matches (1X2 markets)
    
    Based on:
    - Draw odds from bookmakers (market probability)
    - League draw rate (historical data)
    - Team defensive strength
    
    Returns:
        Draw IQ score (0-100)
    """
    try:
        bookmakers = match.get('bookmakers', [])
        if not bookmakers:
            return 30.0  # Default ~30% draw probability for football
        
        # Extract draw odds from bookmakers
        draw_odds = []
        for bookie in bookmakers:
            markets = bookie.get('markets', [])
            if markets:
                outcomes = markets[0].get('outcomes', [])
                for outcome in outcomes:
                    # Look for draw outcome (various names: 'Draw', 'X', 'Tie')
                    if outcome.get('name', '').lower() in ['draw', 'x', 'tie']:
                        price = outcome.get('price')
                        if price and price > 1:
                            draw_odds.append(price)
                        break
        
        if not draw_odds:
            # No draw odds found - use default
            return 30.0
        
        # Calculate average draw odds and implied probability
        avg_draw_odds = sum(draw_odds) / len(draw_odds)
        draw_implied_prob = 1 / avg_draw_odds
        
        # Convert probability to IQ score (0-100)
        # Draw probability typically 20-35% in football
        # Scale: 20% = 20 IQ, 35% = 35 IQ
        draw_iq = draw_implied_prob * 100
        
        # Clamp to reasonable range
        draw_iq = max(15, min(45, draw_iq))
        
        logger.debug(f"Draw IQ: {draw_iq:.2f} (avg_odds={avg_draw_odds:.2f}, implied_prob={draw_implied_prob:.3f})")
        
        return draw_iq
        
    except Exception as e:
        logger.error(f"Error calculating Draw IQ: {e}")
        return 30.0


# ==================== STATS IQ COMPONENT (35%) ====================

async def calculate_team_stats_iq(team_name: str, sport_key: str, db) -> float:
    """
    Calculate Team Stats IQ (20% weight)
    
    Based on win/loss record, goals/runs, recent performance
    
    Uses ESPN + CricketAPI data:
    - Win rate (last 10 games)
    - Home/Away performance
    - Goals/runs scored & conceded
    - Recent form trend
    
    Returns:
        Team Stats IQ score (0-100)
    """
    try:
        # Fetch team historical stats from database
        team_stats_collection = db['team_historical_stats']
        
        team_stats = await team_stats_collection.find_one({
            'team_name': {'$regex': f'^{team_name}$', '$options': 'i'},
            'sport_key': sport_key
        })
        
        if not team_stats:
            logger.warning(f"No historical stats found for {team_name}")
            return 50.0  # Baseline for new teams
        
        # Extract stats
        total_games = team_stats.get('total_games', 0)
        wins = team_stats.get('wins', 0)
        draws = team_stats.get('draws', 0)
        losses = team_stats.get('losses', 0)
        goals_for = team_stats.get('goals_for', 0)
        goals_against = team_stats.get('goals_against', 0)
        home_wins = team_stats.get('home_wins', 0)
        away_wins = team_stats.get('away_wins', 0)
        
        if total_games == 0:
            return 50.0
        
        # Win rate (40% weight)
        win_rate = wins / total_games
        win_rate_score = win_rate * 40
        
        # Goal difference (30% weight)
        goal_diff = goals_for - goals_against
        goal_diff_normalized = min(max(goal_diff / total_games, -2), 2) / 2  # Normalize to -1 to 1
        goal_diff_score = ((goal_diff_normalized + 1) / 2) * 30  # Convert to 0-30
        
        # Home/Away balance (15% weight)
        home_away_ratio = 0
        if (home_wins + away_wins) > 0:
            home_away_ratio = min(home_wins, away_wins) / max(home_wins, away_wins, 1)
        home_away_score = home_away_ratio * 15
        
        # Recent form (15% weight) - from last 5 games
        recent_form = team_stats.get('recent_form', [])  # List of 'W', 'D', 'L'
        form_points = 0
        if recent_form:
            for result in recent_form[-5:]:  # Last 5 games
                if result == 'W':
                    form_points += 3
                elif result == 'D':
                    form_points += 1
            form_score = (form_points / 15) * 15  # Max 15 points (5 wins)
        else:
            form_score = 7.5  # Neutral
        
        # Calculate Stats IQ
        stats_iq = win_rate_score + goal_diff_score + home_away_score + form_score
        
        # Clamp to 0-100
        stats_iq = max(0, min(100, stats_iq))
        
        logger.debug(f"Team Stats IQ for {team_name}: {stats_iq:.2f} (wr={win_rate_score:.1f}, gd={goal_diff_score:.1f}, ha={home_away_score:.1f}, form={form_score:.1f})")
        
        return stats_iq
        
    except Exception as e:
        logger.error(f"Error calculating Stats IQ for {team_name}: {e}")
        return 50.0


# ==================== MOMENTUM IQ COMPONENT (15%) ====================

async def calculate_momentum_iq(team_name: str, sport_key: str, db) -> float:
    """
    Calculate Momentum IQ (10% weight)
    
    Based on past 10 games with custom point system:
    - Home win: +3 points
    - Draw: +2 points
    - Away win: +5 points
    - Each game unbeaten: +2 additional points
    - Each draw in unbeaten streak: +1 additional point
    
    Returns:
        Momentum IQ score (0-100)
    """
    try:
        team_stats_collection = db['team_historical_stats']
        
        team_stats = await team_stats_collection.find_one({
            'team_name': {'$regex': f'^{team_name}$', '$options': 'i'},
            'sport_key': sport_key
        })
        
        if not team_stats:
            return 50.0
        
        recent_results = team_stats.get('recent_results', [])  # List of dicts with venue and result
        if not recent_results:
            return 50.0
        
        momentum_points = 0
        unbeaten_streak = 0
        
        # Process recent results (last 10 games)
        for game in recent_results[-10:]:
            result = game.get('result')  # 'W', 'D', 'L'
            venue = game.get('venue')  # 'home', 'away'
            
            if result == 'W':
                # Award points based on venue
                if venue == 'home':
                    momentum_points += 3  # Home win: +3 points
                else:  # away
                    momentum_points += 5  # Away win: +5 points
                
                # Unbeaten streak bonus
                unbeaten_streak += 1
                momentum_points += 2  # +2 additional points for each unbeaten game
                
            elif result == 'D':
                momentum_points += 2  # Draw: +2 points
                
                # Unbeaten streak bonus
                unbeaten_streak += 1
                momentum_points += 2  # +2 additional points for each unbeaten game
                momentum_points += 1  # +1 additional point for draw in unbeaten streak
                
            else:  # Loss
                # Reset unbeaten streak
                unbeaten_streak = 0
        
        # Normalize to 0-100 scale
        # Max theoretical points for 10 games:
        # 10 away wins = 10 * (5 + 2) = 70 points
        # Or 10 draws = 10 * (2 + 2 + 1) = 50 points
        # Use 70 as max for normalization
        momentum_iq = min((momentum_points / 70) * 100, 100)
        
        logger.debug(f"Momentum IQ for {team_name}: {momentum_iq:.2f} (points={momentum_points:.2f}, unbeaten_streak={unbeaten_streak})")
        
        return momentum_iq
        
    except Exception as e:
        logger.error(f"Error calculating Momentum IQ for {team_name}: {e}")
        return 50.0


# ==================== HEAD TO HEAD IQ (10%) ====================

async def calculate_h2h_iq(home_team: str, away_team: str, sport_key: str, db) -> tuple:
    """
    Calculate Head-to-Head IQ (10% weight)
    
    Based on historical results between these specific teams
    
    Args:
        home_team: Home team name
        away_team: Away team name
        sport_key: Sport identifier
        db: Database instance
    
    Returns:
        Tuple of (home_h2h_iq, away_h2h_iq) scores (0-100)
    """
    try:
        # Try to find historical H2H data
        h2h_collection = db['head_to_head_stats']
        
        # Look for H2H record (either direction)
        h2h_record = await h2h_collection.find_one({
            '$or': [
                {'team1': {'$regex': f'^{home_team}$', '$options': 'i'}, 
                 'team2': {'$regex': f'^{away_team}$', '$options': 'i'}},
                {'team1': {'$regex': f'^{away_team}$', '$options': 'i'}, 
                 'team2': {'$regex': f'^{home_team}$', '$options': 'i'}}
            ],
            'sport_key': sport_key
        })
        
        if not h2h_record:
            # No H2H data - return neutral scores
            logger.debug(f"No H2H data for {home_team} vs {away_team}")
            return (50.0, 50.0)
        
        # Extract H2H statistics
        total_matches = h2h_record.get('total_matches', 0)
        
        if total_matches == 0:
            return (50.0, 50.0)
        
        # Check if teams are in correct order
        is_reversed = h2h_record.get('team1', '').lower() == away_team.lower()
        
        if is_reversed:
            team1_wins = h2h_record.get('team2_wins', 0)  # This is home team
            team2_wins = h2h_record.get('team1_wins', 0)  # This is away team
        else:
            team1_wins = h2h_record.get('team1_wins', 0)  # This is home team
            team2_wins = h2h_record.get('team2_wins', 0)  # This is away team
        
        draws = h2h_record.get('draws', 0)
        
        # Calculate win percentages
        home_win_pct = team1_wins / total_matches
        away_win_pct = team2_wins / total_matches
        draw_pct = draws / total_matches
        
        # Convert to IQ scores (0-100)
        # Account for draws by splitting them
        home_h2h_iq = (home_win_pct + draw_pct * 0.5) * 100
        away_h2h_iq = (away_win_pct + draw_pct * 0.5) * 100
        
        # Boost for recent form in H2H (last 5 matches)
        recent_h2h = h2h_record.get('recent_results', [])[-5:]  # Last 5 H2H matches
        if recent_h2h:
            recent_home_wins = sum(1 for r in recent_h2h if r.get('winner') == 'team1' and not is_reversed or r.get('winner') == 'team2' and is_reversed)
            recent_away_wins = sum(1 for r in recent_h2h if r.get('winner') == 'team2' and not is_reversed or r.get('winner') == 'team1' and is_reversed)
            
            # Recent form bonus (up to +10 points)
            if len(recent_h2h) >= 3:
                recent_home_pct = recent_home_wins / len(recent_h2h)
                recent_away_pct = recent_away_wins / len(recent_h2h)
                
                home_h2h_iq = 0.7 * home_h2h_iq + 0.3 * (recent_home_pct * 100)
                away_h2h_iq = 0.7 * away_h2h_iq + 0.3 * (recent_away_pct * 100)
        
        # Clamp to 0-100
        home_h2h_iq = max(0, min(100, home_h2h_iq))
        away_h2h_iq = max(0, min(100, away_h2h_iq))
        
        logger.debug(f"H2H IQ: {home_team} {home_h2h_iq:.1f} vs {away_team} {away_h2h_iq:.1f} ({total_matches} matches, {team1_wins}-{draws}-{team2_wins})")
        
        return (home_h2h_iq, away_h2h_iq)
        
    except Exception as e:
        logger.error(f"Error calculating H2H IQ: {e}")
        return (50.0, 50.0)


# ==================== AI PROBABILITY BOOST (DEPRECATED - KEPT FOR COMPATIBILITY) ====================

def calculate_ai_boost(market_iq: float, stats_iq: float, momentum_iq: float) -> float:
    """
    Calculate AI Probability Boost based on combined analysis
    
    Formula:
    Estimated Win Probability (EWP) = weighted combination of Market, Stats, Momentum
    AI Boost = EWP * 10 (scaled to 0-10)
    
    Returns:
        AI Boost score (0-10)
    """
    try:
        # Weighted combination (Market is strongest signal)
        ewp = (0.5 * market_iq + 0.3 * stats_iq + 0.2 * momentum_iq) / 100
        
        # Scale to 0-10
        ai_boost = ewp * 10
        
        logger.debug(f"AI Boost: {ai_boost:.2f} (EWP={ewp:.3f})")
        
        return ai_boost
        
    except Exception as e:
        logger.error(f"Error calculating AI Boost: {e}")
        return 5.0


# ==================== FUNBET IQ MASTER CALCULATOR ====================

async def calculate_funbet_iq(match: Dict, db) -> Dict:
    """
    Calculate complete FunBet IQ for a match
    
    Formula:
    FunBet IQ = 0.40 * Market_IQ + 0.30 * Stats_IQ + 0.10 * Momentum_IQ + 0.10 * AI_Boost + 0.10 * API_Predictions
    
    Returns:
        Dict with home_iq, away_iq, and component breakdowns
    """
    try:
        home_team = match.get('home_team', '')
        away_team = match.get('away_team', '')
        sport_key = match.get('sport_key', '')
        
        # Calculate all components for HOME team
        home_market_iq = calculate_market_iq(match, 'home')
        home_stats_iq = await calculate_stats_iq(home_team, sport_key, db)
        home_momentum_iq = await calculate_momentum_iq(home_team, sport_key, db)
        home_ai_boost = calculate_ai_boost(home_market_iq, home_stats_iq, home_momentum_iq)
        
        # Get API-Football predictions if available
        home_api_prediction = 50.0  # Default neutral
        away_api_prediction = 50.0
        
        if match.get('api_prediction'):
            api_pred = match['api_prediction']
            # Convert API prediction to IQ score (0-100)
            if api_pred.get('winner', {}).get('name') == home_team:
                home_api_prediction = 50 + (api_pred.get('percent', {}).get(home_team, 50) / 2)
                away_api_prediction = 50 - (api_pred.get('percent', {}).get(home_team, 50) / 2)
            elif api_pred.get('winner', {}).get('name') == away_team:
                away_api_prediction = 50 + (api_pred.get('percent', {}).get(away_team, 50) / 2)
                home_api_prediction = 50 - (api_pred.get('percent', {}).get(away_team, 50) / 2)
        
        # Calculate FunBet IQ for home (NEW WEIGHTS: 40-30-10-10-10)
        home_iq = (
            0.40 * home_market_iq +
            0.30 * home_stats_iq +
            0.10 * home_momentum_iq +
            0.10 * home_ai_boost +
            0.10 * home_api_prediction
        )
        
        # Calculate all components for AWAY team
        away_market_iq = calculate_market_iq(match, 'away')
        away_stats_iq = await calculate_stats_iq(away_team, sport_key, db)
        away_momentum_iq = await calculate_momentum_iq(away_team, sport_key, db)
        away_ai_boost = calculate_ai_boost(away_market_iq, away_stats_iq, away_momentum_iq)
        
        # Calculate FunBet IQ for away (NEW WEIGHTS: 40-30-10-10-10)
        away_iq = (
            0.40 * away_market_iq +
            0.30 * away_stats_iq +
            0.10 * away_momentum_iq +
            0.10 * away_ai_boost +
            0.10 * away_api_prediction
        )
        
        # Calculate Draw IQ for football and ALL cricket formats (can tie/draw)
        draw_iq = None
        is_football = sport_key and 'soccer' in sport_key.lower()
        is_cricket = sport_key and 'cricket' in sport_key.lower()
        
        if is_football or is_cricket:
            draw_iq = calculate_draw_iq(match)
            logger.debug(f"Match {home_team} vs {away_team}: home_iq={home_iq:.1f}, draw_iq={draw_iq:.1f}, away_iq={away_iq:.1f}")
        
        # Determine winner and confidence based on IQ difference
        # Realistic thresholds based on actual data (max diff ~6 points, avg ~1.5 points)
        iq_diff = abs(home_iq - away_iq)
        if iq_diff >= 4.5:
            confidence = 'High'  # Top 10% of matches - clear favorite
        elif iq_diff >= 2.0:
            confidence = 'Medium'  # Noticeable edge
        else:
            confidence = 'Low'  # Evenly matched (< 2 points)
        
        # Determine trend
        home_trend = '↗' if home_iq > 60 else '↘' if home_iq < 40 else '→'
        away_trend = '↗' if away_iq > 60 else '↘' if away_iq < 40 else '→'
        
        # Determine predicted winner (including draw possibility)
        predicted_winner = 'home'
        if draw_iq is not None:
            # Check all three outcomes for sports that can draw
            if draw_iq > home_iq and draw_iq > away_iq:
                predicted_winner = 'draw'
            elif away_iq > home_iq:
                predicted_winner = 'away'
        else:
            # Only home vs away for sports without draws
            if away_iq > home_iq:
                predicted_winner = 'away'
        
        # Generate verdict
        if draw_iq is not None and draw_iq > home_iq and draw_iq > away_iq:
            verdict = "Draw likely"
        elif home_iq > away_iq + 5:
            verdict = f"{home_team} favoured"
        elif away_iq > home_iq + 5:
            verdict = f"{away_team} favoured"
        else:
            verdict = "Closely matched"
        
        result = {
            'match_id': match.get('id'),
            'home_team': home_team,
            'away_team': away_team,
            'sport_key': sport_key,
            'home_iq': round(home_iq, 1),
            'away_iq': round(away_iq, 1),
            'draw_iq': round(draw_iq, 1) if draw_iq is not None else None,
            'predicted_winner': predicted_winner,
            'confidence': confidence,
            'verdict': verdict,
            'home_components': {
                'market_iq': round(home_market_iq, 1),
                'stats_iq': round(home_stats_iq, 1),
                'momentum_iq': round(home_momentum_iq, 1),
                'ai_boost': round(home_ai_boost, 1)
            },
            'away_components': {
                'market_iq': round(away_market_iq, 1),
                'stats_iq': round(away_stats_iq, 1),
                'momentum_iq': round(away_momentum_iq, 1),
                'ai_boost': round(away_ai_boost, 1)
            },
            'home_trend': home_trend,
            'away_trend': away_trend,
            'calculated_at': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"✅ FunBet IQ calculated: {home_team} {home_iq:.1f} vs {away_team} {away_iq:.1f} ({confidence} confidence)")
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating FunBet IQ: {e}")
        return None

# ==================== BATCH CALCULATOR FOR BACKGROUND WORKER ====================

async def calculate_funbet_iq_for_matches(db, limit: int = 500) -> Dict:
    """
    Calculate FunBet IQ for all matches in the database
    This is called by the background worker every 10 minutes
    
    CRITICAL: Only calculates for PRE-MATCH games (commence_time in the future)
    This ensures predictions are NEVER calculated or updated after a match starts
    
    Args:
        db: MongoDB database instance
        limit: Maximum number of matches to process
        
    Returns:
        Dict with statistics: total_matches, calculated, errors
    """
    try:
        logger.info(f"🧠 Starting batch IQ calculation for up to {limit} PRE-MATCH games...")
        
        # CRITICAL: Only get FUTURE matches (not started yet)
        # This ensures predictions are PRE-MATCH ONLY
        now = datetime.now(timezone.utc)
        now_str = now.isoformat().replace('+00:00', 'Z')
        
        matches_cursor = db.odds_cache.find(
            {'commence_time': {'$gt': now_str}}  # FUTURE matches ONLY (not started)
        ).limit(limit)
        
        matches = await matches_cursor.to_list(length=limit)
        total_matches = len(matches)
        
        if total_matches == 0:
            logger.warning("⚠️ No PRE-MATCH upcoming matches found in database")
            return {'total_matches': 0, 'calculated': 0, 'errors': 0}
        
        logger.info(f"📊 Found {total_matches} PRE-MATCH upcoming matches to calculate IQ for...")
        
        calculated_count = 0
        error_count = 0
        errors_list = []
        
        for match in matches:
            try:
                # CRITICAL: Check if prediction already exists
                # Once a prediction is made, it should NEVER be recalculated or updated
                existing_prediction = await db.funbet_iq_predictions.find_one(
                    {'match_id': match.get('id')}
                )
                
                if existing_prediction:
                    # Prediction already exists - skip to preserve original pre-match prediction
                    calculated_count += 1  # Count as "processed"
                    continue
                
                # Calculate FunBet IQ for this match (first time only)
                iq_result = await calculate_funbet_iq(match, db)
                
                if iq_result:
                    # Store ONLY if prediction doesn't exist (insert only, never update)
                    await db.funbet_iq_predictions.insert_one(iq_result)
                    calculated_count += 1
                else:
                    error_count += 1
                    errors_list.append(f"{match.get('home_team')} vs {match.get('away_team')}: Calculation returned None")
                    
            except Exception as e:
                error_count += 1
                errors_list.append(f"{match.get('home_team')} vs {match.get('away_team')}: {str(e)}")
                logger.error(f"❌ Error calculating IQ for match: {e}")
        
        logger.info(f"✅ Batch IQ calculation complete: {calculated_count}/{total_matches} successful")
        
        if error_count > 0:
            logger.warning(f"⚠️ {error_count} matches had errors during calculation")
        
        return {
            'total_matches': total_matches,
            'calculated': calculated_count,
            'errors': error_count,
            'error_details': errors_list[:10]  # Only return first 10 errors
        }
        
    except Exception as e:
        logger.error(f"❌ Fatal error in batch IQ calculation: {e}")
        return {
            'total_matches': 0,
            'calculated': 0,
            'errors': 1,
            'error_details': [str(e)]
        }
