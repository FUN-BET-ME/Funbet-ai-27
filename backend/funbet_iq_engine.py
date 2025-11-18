"""
FunBet IQ V3 - Enhanced with API-Football Predictions

Architecture:
- Market IQ (40%): Odds analysis, edge calculation, movement tracking
- Stats IQ (30%): Historical results from API-Sports
- Momentum IQ (10%): Form, streaks with custom point system
- AI Probability Boost (10%): Combined probability analysis
- API Predictions (10%): API-Football expert predictions

Final Formula:
FunBet IQ = 0.40 * Market_IQ + 0.30 * Stats_IQ + 0.10 * Momentum_IQ + 0.10 * AI_Boost + 0.10 * API_Predictions
Scaled to 0-100
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import statistics

logger = logging.getLogger(__name__)


# ==================== MARKET IQ COMPONENT (40%) ====================

def calculate_market_iq(match: Dict, team_type: str = 'home') -> float:
    """
    Calculate Market IQ based on odds analysis
    
    Formula:
    Market IQ = 50 + 20 * Market_Edge + 10 * Movement_Score + 10 * Volume_Score
    
    Args:
        match: Match data with bookmakers
        team_type: 'home' or 'away'
    
    Returns:
        Market IQ score (0-100)
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
        
        # Calculate final Market IQ
        market_iq = base_market_iq + odds_value_bonus + certainty_bonus
        
        # Clamp to 0-100
        market_iq = max(0, min(100, market_iq))
        
        logger.debug(f"Market IQ for {team_type}: {market_iq:.2f} (prob={market_implied_prob:.3f}, base={base_market_iq:.1f}, value_bonus={odds_value_bonus:.1f}, certainty_bonus={certainty_bonus:.1f}, avg_odds={avg_odds:.2f})")
        
        return market_iq
        
    except Exception as e:
        logger.error(f"Error calculating Market IQ: {e}")
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

async def calculate_stats_iq(team_name: str, sport_key: str, db) -> float:
    """
    Calculate Stats IQ based on historical performance
    
    Uses ESPN + CricketAPI data:
    - Win rate (last 10 games)
    - Home/Away performance
    - Goals/runs scored & conceded
    - Recent form trend
    
    Returns:
        Stats IQ score (0-100)
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
        
        logger.debug(f"Stats IQ for {team_name}: {stats_iq:.2f} (wr={win_rate_score:.1f}, gd={goal_diff_score:.1f}, ha={home_away_score:.1f}, form={form_score:.1f})")
        
        return stats_iq
        
    except Exception as e:
        logger.error(f"Error calculating Stats IQ for {team_name}: {e}")
        return 50.0


# ==================== MOMENTUM IQ COMPONENT (15%) ====================

async def calculate_momentum_iq(team_name: str, sport_key: str, db) -> float:
    """
    Calculate Momentum IQ based on custom streak points system
    
    Rules (Football & Cricket):
    - Home win: 0.5 points
    - Away win: 0.75 points
    - 3 games win in a row: +10 points
    - 3 games unbeaten: +5 points
    - 5 games win: +40 points
    - 5+ games winning: +70 points
    - 5+ games unbeaten: +50 points
    
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
        current_win_streak = 0
        current_unbeaten_streak = 0
        max_win_streak = 0
        max_unbeaten_streak = 0
        
        # Process recent results (last 10 games)
        for game in recent_results[-10:]:
            result = game.get('result')  # 'W', 'D', 'L'
            venue = game.get('venue')  # 'home', 'away'
            
            # Award points for wins
            if result == 'W':
                if venue == 'home':
                    momentum_points += 0.5
                else:  # away
                    momentum_points += 0.75
                
                current_win_streak += 1
                current_unbeaten_streak += 1
                max_win_streak = max(max_win_streak, current_win_streak)
                max_unbeaten_streak = max(max_unbeaten_streak, current_unbeaten_streak)
                
            elif result == 'D':
                current_win_streak = 0
                current_unbeaten_streak += 1
                max_unbeaten_streak = max(max_unbeaten_streak, current_unbeaten_streak)
                
            else:  # Loss
                current_win_streak = 0
                current_unbeaten_streak = 0
        
        # Award bonus points for streaks
        if max_win_streak >= 5:
            momentum_points += 70  # 5+ wins
        elif max_win_streak >= 5:
            momentum_points += 40  # Exactly 5 wins
        elif max_win_streak >= 3:
            momentum_points += 10  # 3 wins
        
        if max_unbeaten_streak >= 5:
            momentum_points += 50  # 5+ unbeaten
        elif max_unbeaten_streak >= 3 and max_win_streak < 3:
            momentum_points += 5  # 3 unbeaten (only if not already counted as wins)
        
        # Normalize to 0-100 scale
        # Max theoretical points: ~15 (10 away wins) + 70 (streak) + 50 (unbeaten) = 135
        momentum_iq = min((momentum_points / 135) * 100, 100)
        
        logger.debug(f"Momentum IQ for {team_name}: {momentum_iq:.2f} (points={momentum_points:.2f}, win_streak={max_win_streak}, unbeaten={max_unbeaten_streak})")
        
        return momentum_iq
        
    except Exception as e:
        logger.error(f"Error calculating Momentum IQ for {team_name}: {e}")
        return 50.0


# ==================== AI PROBABILITY BOOST (10%) ====================

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
    
    Args:
        db: MongoDB database instance
        limit: Maximum number of matches to process
        
    Returns:
        Dict with statistics: total_matches, calculated, errors
    """
    try:
        logger.info(f"🧠 Starting batch IQ calculation for up to {limit} matches...")
        
        # Get all matches from last 6 hours to future (includes live, recent, and upcoming)
        now = datetime.now(timezone.utc)
        six_hours_ago = now - timedelta(hours=6)
        six_hours_ago_str = six_hours_ago.isoformat().replace('+00:00', 'Z')
        
        matches_cursor = db.odds_cache.find(
            {'commence_time': {'$gte': six_hours_ago_str}}  # Last 6 hours + future
        ).limit(limit)
        
        matches = await matches_cursor.to_list(length=limit)
        total_matches = len(matches)
        
        if total_matches == 0:
            logger.warning("⚠️ No upcoming matches found in database")
            return {'total_matches': 0, 'calculated': 0, 'errors': 0}
        
        logger.info(f"📊 Found {total_matches} upcoming matches to calculate IQ for...")
        
        calculated_count = 0
        error_count = 0
        errors_list = []
        
        for match in matches:
            try:
                # Calculate FunBet IQ for this match
                iq_result = await calculate_funbet_iq(match, db)
                
                if iq_result:
                    # Store in funbet_iq_predictions collection (upsert)
                    await db.funbet_iq_predictions.update_one(
                        {'match_id': iq_result['match_id']},
                        {'$set': iq_result},
                        upsert=True
                    )
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
