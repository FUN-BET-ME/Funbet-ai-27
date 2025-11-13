"""
Smart Predictions Generator for Football & Cricket
Analyzes odds from all bookmakers to generate AI-style predictions
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict
import statistics

logger = logging.getLogger(__name__)

class PredictionsGenerator:
    def __init__(self):
        self.min_bookmakers = 5  # Minimum bookmakers needed for reliable prediction
        
    def analyze_match(self, match: Dict) -> Dict:
        """Analyze a single match and generate prediction"""
        try:
            bookmakers = match.get('bookmakers', [])
            if len(bookmakers) < self.min_bookmakers:
                return None
            
            # Extract odds from all bookmakers (excluding FunBet)
            home_odds = []
            draw_odds = []
            away_odds = []
            
            for bookmaker in bookmakers:
                if bookmaker.get('key') == 'funbet':
                    continue
                    
                markets = bookmaker.get('markets', [])
                if not markets:
                    continue
                    
                outcomes = markets[0].get('outcomes', [])
                if len(outcomes) < 2:
                    continue
                
                # Match outcomes to home/draw/away
                for outcome in outcomes:
                    name = outcome.get('name', '').lower()
                    price = outcome.get('price', 0)
                    
                    if price <= 0:
                        continue
                    
                    home_team = match.get('home_team', '').lower()
                    away_team = match.get('away_team', '').lower()
                    
                    if name == home_team or home_team in name:
                        home_odds.append(price)
                    elif name == away_team or away_team in name:
                        away_odds.append(price)
                    elif 'draw' in name or 'tie' in name:
                        draw_odds.append(price)
            
            if not home_odds or not away_odds:
                return None
            
            # Calculate average odds
            avg_home = statistics.mean(home_odds)
            avg_away = statistics.mean(away_odds)
            avg_draw = statistics.mean(draw_odds) if draw_odds else None
            
            # Calculate implied probabilities
            prob_home = (1 / avg_home) * 100
            prob_away = (1 / avg_away) * 100
            prob_draw = (1 / avg_draw) * 100 if avg_draw else 0
            
            # Normalize probabilities (bookmaker margin removal)
            total_prob = prob_home + prob_away + prob_draw
            prob_home = (prob_home / total_prob) * 100
            prob_away = (prob_away / total_prob) * 100
            prob_draw = (prob_draw / total_prob) * 100 if prob_draw > 0 else 0
            
            # Determine prediction
            max_prob = max(prob_home, prob_away, prob_draw if prob_draw > 0 else 0)
            
            if max_prob == prob_home:
                predicted_outcome = 'home'
                predicted_team = match.get('home_team')
                confidence = prob_home
                recommended_odds = avg_home
            elif max_prob == prob_away:
                predicted_outcome = 'away'
                predicted_team = match.get('away_team')
                confidence = prob_away
                recommended_odds = avg_away
            else:
                predicted_outcome = 'draw'
                predicted_team = 'Draw'
                confidence = prob_draw
                recommended_odds = avg_draw
            
            # Calculate value score (higher is better)
            # Value = (odds * probability) - 1
            value_score = (recommended_odds * (confidence / 100)) - 1
            
            # Adjust confidence based on odds consistency (lower std dev = higher confidence)
            if predicted_outcome == 'home':
                odds_std = statistics.stdev(home_odds) if len(home_odds) > 1 else 0
            elif predicted_outcome == 'away':
                odds_std = statistics.stdev(away_odds) if len(away_odds) > 1 else 0
            else:
                odds_std = statistics.stdev(draw_odds) if len(draw_odds) > 1 else 0
            
            # Boost confidence if odds are consistent (low std deviation)
            consistency_boost = max(0, 5 - odds_std)
            confidence = min(99, confidence + consistency_boost)
            
            # Create prediction object
            prediction = {
                'match_id': match.get('id'),
                'sport_key': match.get('sport_key'),
                'sport_title': match.get('sport_title'),
                'home_team': match.get('home_team'),
                'away_team': match.get('away_team'),
                'commence_time': match.get('commence_time'),
                'prediction': {
                    'predicted_outcome': predicted_outcome,
                    'predicted_team': predicted_team,
                    'confidence': round(confidence, 1),
                    'value_score': round(value_score, 3)
                },
                'odds': {
                    'home': {'average': round(avg_home, 2), 'funbet': self._get_funbet_odds(match, 'home')},
                    'away': {'average': round(avg_away, 2), 'funbet': self._get_funbet_odds(match, 'away')},
                    'draw': {'average': round(avg_draw, 2), 'funbet': self._get_funbet_odds(match, 'draw')} if avg_draw else None
                },
                'probabilities': {
                    'home': round(prob_home, 1),
                    'away': round(prob_away, 1),
                    'draw': round(prob_draw, 1) if prob_draw > 0 else None
                },
                'analysis': {
                    'bookmakers_count': len(bookmakers),
                    'odds_consistency': round(consistency_boost, 2),
                    'market_consensus': 'Strong' if consistency_boost > 3 else 'Moderate' if consistency_boost > 1 else 'Weak'
                }
            }
            
            return prediction
            
        except Exception as e:
            logger.error(f"Error analyzing match {match.get('id')}: {e}")
            return None
    
    def _get_funbet_odds(self, match: Dict, outcome: str) -> float:
        """Get FunBet odds for a specific outcome"""
        try:
            for bookmaker in match.get('bookmakers', []):
                if bookmaker.get('key') == 'funbet':
                    outcomes = bookmaker.get('markets', [{}])[0].get('outcomes', [])
                    
                    home_team = match.get('home_team', '').lower()
                    away_team = match.get('away_team', '').lower()
                    
                    for out in outcomes:
                        name = out.get('name', '').lower()
                        
                        if outcome == 'home' and (name == home_team or home_team in name):
                            return round(out.get('price', 0), 2)
                        elif outcome == 'away' and (name == away_team or away_team in name):
                            return round(out.get('price', 0), 2)
                        elif outcome == 'draw' and ('draw' in name or 'tie' in name):
                            return round(out.get('price', 0), 2)
            
            return 0.0
        except:
            return 0.0
    
    def generate_all_predictions(self, matches: List[Dict]) -> Dict:
        """Generate predictions for all matches"""
        try:
            predictions = []
            
            for match in matches:
                prediction = self.analyze_match(match)
                if prediction:
                    predictions.append(prediction)
            
            # Sort by confidence (highest first)
            predictions.sort(key=lambda x: x['prediction']['confidence'], reverse=True)
            
            # Categorize predictions
            high_confidence = [p for p in predictions if p['prediction']['confidence'] >= 70]
            medium_confidence = [p for p in predictions if 50 <= p['prediction']['confidence'] < 70]
            value_bets = sorted(predictions, key=lambda x: x['prediction']['value_score'], reverse=True)[:10]
            
            return {
                'all_predictions': predictions,
                'high_confidence': high_confidence,
                'medium_confidence': medium_confidence,
                'value_bets': value_bets,
                'total_count': len(predictions),
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'sports_breakdown': self._get_sports_breakdown(predictions)
            }
            
        except Exception as e:
            logger.error(f"Error generating predictions: {e}")
            return {
                'all_predictions': [],
                'high_confidence': [],
                'medium_confidence': [],
                'value_bets': [],
                'total_count': 0,
                'error': str(e)
            }
    
    def _get_sports_breakdown(self, predictions: List[Dict]) -> Dict:
        """Get breakdown by sport"""
        breakdown = {
            'football': 0,
            'cricket': 0
        }
        
        for pred in predictions:
            sport_key = pred.get('sport_key', '')
            if 'soccer' in sport_key:
                breakdown['football'] += 1
            elif 'cricket' in sport_key:
                breakdown['cricket'] += 1
        
        return breakdown

# Global instance
predictions_generator = PredictionsGenerator()
