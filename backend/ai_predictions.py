"""
AI Smart Picks Engine for FunBet.AI
Analyzes odds, historical data, and patterns to generate betting recommendations
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
import statistics

logger = logging.getLogger(__name__)


class AIPrediction:
    """Single AI prediction with reasoning"""
    def __init__(self, match: dict, prediction: dict):
        self.match = match
        self.prediction = prediction


def calculate_value_score(funbet_odds: float, market_best: float) -> float:
    """Calculate value score (higher is better)"""
    if market_best == 0 or funbet_odds == 0:
        return 0
    return ((funbet_odds - market_best) / market_best) * 100


def analyze_match_for_prediction(match: dict, recent_scores: dict = None) -> Optional[Dict]:
    """
    Analyze a single match and predict the MOST LIKELY WINNER
    Based on:
    - Market consensus (implied probability)
    - Team form (recent results)
    - Bookmaker confidence
    Returns prediction dict or None if not confident enough
    """
    try:
        bookmakers = match.get('bookmakers', [])
        if len(bookmakers) < 1:
            return None  # Need at least 1 bookmaker for analysis (Digitain is master API)
        
        home_team = match['home_team']
        away_team = match['away_team']
        
        # Find best odds from all bookmakers to calculate FunBet.ME (5% boost)
        best_home_odds = 0
        best_draw_odds = 0
        best_away_odds = 0
        
        for bookmaker in bookmakers:
            outcomes = bookmaker.get('markets', [{}])[0].get('outcomes', [])
            for outcome in outcomes:
                if outcome['name'] == home_team:
                    best_home_odds = max(best_home_odds, outcome['price'])
                elif outcome['name'] == 'Draw':
                    best_draw_odds = max(best_draw_odds, outcome['price'])
                elif outcome['name'] == away_team:
                    best_away_odds = max(best_away_odds, outcome['price'])
        
        if best_home_odds == 0 or best_away_odds == 0:
            return None
        
        # Calculate FunBet.ME odds (5% boost on best market odds)
        funbet_home = round(best_home_odds * 1.05, 2)
        funbet_draw = round(best_draw_odds * 1.05, 2) if best_draw_odds > 0 else 0
        funbet_away = round(best_away_odds * 1.05, 2)
        
        # Calculate IMPLIED PROBABILITIES (who market thinks will win)
        home_prob = (1 / funbet_home) * 100
        away_prob = (1 / funbet_away) * 100
        draw_prob = (1 / funbet_draw) * 100 if funbet_draw > 0 else 0
        
        # Find the FAVORITE (highest implied probability = lowest odds)
        candidates = [
            {'outcome': 'home', 'team': home_team, 'odds': funbet_home, 'probability': home_prob},
            {'outcome': 'away', 'team': away_team, 'odds': funbet_away, 'probability': away_prob},
        ]
        
        # Only include draw if it's realistic (3.0-4.5 odds = 22-33% probability)
        if funbet_draw > 0 and 3.0 <= funbet_draw <= 4.5:
            candidates.append({'outcome': 'draw', 'team': 'Draw', 'odds': funbet_draw, 'probability': draw_prob})
        
        # Sort by probability (highest first)
        candidates.sort(key=lambda x: x['probability'], reverse=True)
        
        favorite = candidates[0]
        
        # GENERATE PREDICTION FOR ALL MATCHES (no minimum threshold)
        # Even close matches get a prediction, just with lower confidence
        
        # Check market consensus (how many bookmakers agree)
        bookmaker_agreement = 0
        total_bookmakers = len(bookmakers)
        
        for bookmaker in bookmakers:
            outcomes = bookmaker.get('markets', [{}])[0].get('outcomes', [])
            for outcome in outcomes:
                if outcome['name'] == favorite['team']:
                    # This bookmaker has the favorite at good odds
                    if outcome['price'] <= 2.5:  # They also think it's likely
                        bookmaker_agreement += 1
                    break
        
        consensus_pct = (bookmaker_agreement / total_bookmakers * 100) if total_bookmakers > 0 else 0
        
        # All matches get predictions now - no consensus threshold
        
        # Calculate confidence based on probability and consensus
        confidence = min(90, favorite['probability'] + (consensus_pct * 0.3))
        
        best_pred = {
            'outcome': favorite['outcome'],
            'team': favorite['team'],
            'funbet_odds': favorite['odds'],
            'probability': favorite['probability'],
            'confidence': confidence,
            'consensus': consensus_pct,
            'bookmakers_agree': bookmaker_agreement,
            'total_bookmakers': total_bookmakers
        }
        
        # Generate reasoning based on analysis
        reasoning = generate_winner_reasoning(match, best_pred)
        
        return {
            'match_id': match.get('id'),
            'home_team': home_team,
            'away_team': away_team,
            'sport_title': match.get('sport_title', ''),
            'commence_time': match.get('commence_time', ''),
            'prediction': best_pred['outcome'],
            'predicted_team': best_pred['team'],
            'funbet_odds': best_pred['funbet_odds'],
            'win_probability': round(best_pred['probability'], 1),
            'confidence_score': round(best_pred['confidence'], 0),
            'market_consensus': round(best_pred['consensus'], 0),
            'reasoning': reasoning,
            'bookmakers_analyzed': len(bookmakers)
        }
    
    except Exception as e:
        logger.warning(f"Error analyzing match: {e}")
        return None


def generate_winner_reasoning(match: dict, prediction: dict) -> List[str]:
    """Generate human-readable reasoning for why this team should win"""
    reasoning = []
    
    team = prediction['team']
    probability = prediction['probability']
    consensus = prediction['consensus']
    odds = prediction['funbet_odds']
    bookmakers_agree = prediction['bookmakers_agree']
    total_bookmakers = prediction['total_bookmakers']
    
    # Main prediction statement
    if probability >= 60:
        reasoning.append(f"🎯 Strong Favorite: Market gives {team} a {probability:.0f}% chance to win")
    elif probability >= 50:
        reasoning.append(f"✅ Likely Winner: {team} has {probability:.0f}% implied probability")
    else:
        reasoning.append(f"⚖️ Best Chance: {team} favored with {probability:.0f}% probability")
    
    # Bookmaker consensus
    if consensus >= 60:
        reasoning.append(f"🤝 Strong Consensus: {bookmakers_agree}/{total_bookmakers} bookmakers agree")
    elif consensus >= 40:
        reasoning.append(f"📊 Market Confidence: {bookmakers_agree}/{total_bookmakers} bookmakers back this pick")
    else:
        reasoning.append(f"📈 Market Lean: {bookmakers_agree}/{total_bookmakers} bookmakers favor this outcome")
    
    # Odds value with FunBet.ME boost
    reasoning.append(f"💰 Best Odds: FunBet.ME offers {odds}")
    
    return reasoning


async def generate_ai_predictions(all_matches: List[dict], limit: int = 20) -> List[dict]:
    """
    Generate top AI predictions from matches in next 48 hours
    Returns sorted list of best value bets with reasoning
    """
    try:
        from datetime import datetime, timezone, timedelta
        
        # Filter matches for next 14 days (2 weeks) - BUT EXCLUDE LIVE MATCHES
        # Pre-match odds become invalid once match starts
        now = datetime.now(timezone.utc)
        cutoff_time = now + timedelta(days=14)  # Show next 2 weeks
        
        # Include BOTH upcoming AND recently completed matches (for accuracy tracking)
        relevant_matches = []
        for match in all_matches:
            try:
                commence_time = datetime.fromisoformat(match['commence_time'].replace('Z', '+00:00'))
                
                # Include matches from 7 DAYS ago up to 7 days in future
                # This allows us to build a track record and show prediction accuracy
                hours_since_start = (now - commence_time).total_seconds() / 3600  # hours
                hours_until_start = (commence_time - now).total_seconds() / 3600  # hours
                
                # Include if:
                # 1. Starting in next 14 days (upcoming - 2 weeks)
                # 2. Started in last 7 DAYS (completed - for accuracy tracking)
                if (hours_until_start >= 0.08 and commence_time < cutoff_time) or \
                   (hours_since_start >= 0 and hours_since_start <= 168):  # 168 hours = 7 days for tracking
                    relevant_matches.append(match)
            except:
                continue
        
        logger.info(f"Analyzing {len(relevant_matches)} matches (including completed) from {len(all_matches)} total for AI predictions")
        
        predictions = []
        for match in relevant_matches:
            prediction = analyze_match_for_prediction(match, recent_scores=None)  # TODO: Add form analysis
            if prediction:
                # Add match status for completed games
                commence_time = datetime.fromisoformat(match['commence_time'].replace('Z', '+00:00'))
                hours_since_start = (now - commence_time).total_seconds() / 3600
                
                # Mark as completed if match started (keep for up to 7 days for track record)
                if hours_since_start > 0 and hours_since_start <= 168:  # 168 hours = 7 days
                    prediction['match_status'] = 'completed'
                    # Check if we have the actual result (scores)
                    if match.get('scores'):
                        prediction['actual_scores'] = match['scores']
                else:
                    prediction['match_status'] = 'upcoming'
                
                predictions.append(prediction)
        
        # Sort by commence_time (SOONEST matches first, showing next 2 weeks)
        # This ensures users see upcoming matches in chronological order
        predictions.sort(key=lambda x: x.get('commence_time', '9999-12-31'))
        
        # Return top predictions (showing soonest matches)
        top_predictions = predictions[:limit]
        
        logger.info(f"Generated {len(top_predictions)} AI predictions (from {len(predictions)} candidates)")
        return top_predictions
    
    except Exception as e:
        logger.error(f"Error generating AI predictions: {e}")
        return []
