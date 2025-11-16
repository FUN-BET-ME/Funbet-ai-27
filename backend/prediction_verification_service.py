"""
Prediction Verification Service - Tracks FunBet IQ Accuracy
Verifies predictions against actual match results
"""

from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

class PredictionVerificationService:
    """Service to verify FunBet IQ predictions against actual results"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.iq_scores_collection = db.funbet_iq_predictions  # Updated to use correct collection with draw_iq
        self.odds_collection = db.odds_cache
    
    async def verify_completed_matches(self, hours_back: int = 24):
        """
        Verify predictions for matches that have completed
        
        Args:
            hours_back: Look at all unverified predictions (parameter kept for API compatibility)
            
        Returns:
            dict: Statistics about verification run
        """
        try:
            logger.info(f"🔍 Starting prediction verification for all unverified predictions...")
            
            # Find ALL unverified predictions (regardless of when they were calculated)
            # We'll check if their matches have finished when we verify each one
            query = {
                '$or': [
                    {'prediction_correct': {'$exists': False}},
                    {'prediction_correct': None}
                ]
            }
            
            predictions_to_verify = await self.iq_scores_collection.find(query).to_list(length=None)
            
            logger.info(f"📊 Found {len(predictions_to_verify)} unverified predictions to check")
            
            verified_count = 0
            correct_count = 0
            incorrect_count = 0
            pending_count = 0
            
            for prediction in predictions_to_verify:
                result = await self._verify_single_prediction(prediction)
                
                if result == 'correct':
                    correct_count += 1
                    verified_count += 1
                elif result == 'incorrect':
                    incorrect_count += 1
                    verified_count += 1
                elif result == 'pending':
                    pending_count += 1
            
            logger.info(f"✅ Verification complete: {verified_count} verified ({correct_count} correct, {incorrect_count} incorrect), {pending_count} still pending")
            
            return {
                'total_checked': len(predictions_to_verify),
                'verified': verified_count,
                'correct': correct_count,
                'incorrect': incorrect_count,
                'pending': pending_count
            }
            
        except Exception as e:
            logger.error(f"❌ Error in prediction verification: {e}")
            return None
    
    async def _verify_single_prediction(self, prediction: dict) -> str:
        """
        Verify a single prediction against actual match result
        
        Returns:
            'correct', 'incorrect', or 'pending'
        """
        try:
            match_id = prediction.get('match_id')
            home_team = prediction.get('home_team')
            away_team = prediction.get('away_team')
            
            # Get match data from odds cache
            match_data = await self.odds_collection.find_one({'id': match_id})
            
            if not match_data:
                logger.debug(f"Match {match_id} not found in odds cache")
                return 'pending'
            
            # If match_data doesn't have scores, try to fetch from live scores service
            if not match_data.get('scores'):
                try:
                    from live_scores_service import live_scores_service
                    scores_data = await live_scores_service.get_all_live_scores(force_refresh=False)
                    
                    # Try to find scores for this match
                    all_scores = scores_data.get('completed_scores', []) + scores_data.get('live_scores', [])
                    
                    for score in all_scores:
                        # Match by team names (case-insensitive)
                        if (score.get('home_team', '').lower() == home_team.lower() and 
                            score.get('away_team', '').lower() == away_team.lower()):
                            # Merge scores into match_data
                            match_data['scores'] = score.get('scores', [])
                            match_data['completed'] = score.get('completed', False)
                            logger.info(f"✅ Found scores for {home_team} vs {away_team} from live scores service")
                            break
                except Exception as e:
                    logger.debug(f"Could not fetch scores from live service: {e}")
            
            # Check if match has completed
            commence_time = match_data.get('commence_time')
            if not commence_time:
                return 'pending'
            
            # Parse commence time
            if isinstance(commence_time, str):
                commence_dt = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
            else:
                commence_dt = commence_time
            
            now = datetime.now(timezone.utc)
            hours_since_start = (now - commence_dt).total_seconds() / 3600
            
            # Check if match should be completed based on sport
            sport_key = prediction.get('sport_key', '')
            
            if 'cricket' in sport_key.lower():
                if 'test' in sport_key.lower():
                    # Test matches: 5 days (120 hours)
                    if hours_since_start < 120:
                        return 'pending'
                else:
                    # ODI/T20: 8 hours
                    if hours_since_start < 8:
                        return 'pending'
            else:
                # Football: 3 hours
                if hours_since_start < 3:
                    return 'pending'
            
            # Match should be completed by now
            # Try to get actual result from match_data
            actual_winner = self._determine_actual_winner(match_data)
            
            if actual_winner is None:
                logger.debug(f"Cannot determine winner for match {match_id}")
                return 'pending'
            
            # Get predicted winner from IQ scores (consider draw_iq for football)
            home_iq = prediction.get('home_iq', 0)
            away_iq = prediction.get('away_iq', 0)
            draw_iq = prediction.get('draw_iq', 0)  # Will be 0 for non-football sports
            
            # Find the highest IQ score to determine prediction
            max_iq = max(home_iq, away_iq, draw_iq)
            
            if draw_iq > 0 and draw_iq == max_iq:
                # Draw has highest IQ (only possible for football)
                predicted_winner = 'draw'
            elif home_iq == max_iq:
                predicted_winner = 'home'
            elif away_iq == max_iq:
                predicted_winner = 'away'
            else:
                # Fallback (should never happen)
                predicted_winner = 'home' if home_iq > away_iq else 'away'
            
            # Compare prediction with actual result
            is_correct = (predicted_winner == actual_winner)
            
            # Update prediction in database
            await self.iq_scores_collection.update_one(
                {'_id': prediction['_id']},
                {
                    '$set': {
                        'actual_winner': actual_winner,
                        'predicted_winner': predicted_winner,
                        'prediction_correct': is_correct,
                        'match_status': 'completed',
                        'verified_at': now
                    }
                }
            )
            
            result_emoji = '✅' if is_correct else '❌'
            logger.info(f"{result_emoji} Match {match_id}: Predicted {predicted_winner}, Actual {actual_winner}")
            
            return 'correct' if is_correct else 'incorrect'
            
        except Exception as e:
            logger.error(f"Error verifying prediction for match {prediction.get('match_id')}: {e}")
            return 'pending'
    
    def _determine_actual_winner(self, match_data: dict) -> str:
        """
        Determine actual match winner from match data
        
        Returns:
            'home', 'away', 'draw', or None if cannot determine
        """
        try:
            # Check if match has scores
            scores = match_data.get('scores')
            
            if scores and isinstance(scores, list) and len(scores) == 2:
                home_score = scores[0].get('score')
                away_score = scores[1].get('score')
                
                if home_score is not None and away_score is not None:
                    if home_score > away_score:
                        return 'home'
                    elif away_score > home_score:
                        return 'away'
                    else:
                        return 'draw'
            
            # Alternative: Check bookmaker odds movement
            # If final odds heavily favor one side, might indicate result
            # (This is less reliable but can be a fallback)
            
            return None
            
        except Exception as e:
            logger.error(f"Error determining winner: {e}")
            return None
    
    async def get_accuracy_stats(self):
        """
        Get overall accuracy statistics for FunBet IQ
        
        Returns:
            dict: Accuracy statistics
        """
        try:
            # Get all verified predictions
            verified_predictions = await self.iq_scores_collection.find({
                'prediction_correct': {'$ne': None}
            }).to_list(length=None)
            
            total = len(verified_predictions)
            
            if total == 0:
                return {
                    'overall': {
                        'total': 0,
                        'correct': 0,
                        'incorrect': 0,
                        'accuracy_percentage': 0
                    }
                }
            
            correct = sum(1 for p in verified_predictions if p.get('prediction_correct'))
            incorrect = total - correct
            accuracy = (correct / total * 100) if total > 0 else 0
            
            # Break down by confidence level
            high_preds = [p for p in verified_predictions if p.get('confidence') == 'High']
            medium_preds = [p for p in verified_predictions if p.get('confidence') == 'Medium']
            low_preds = [p for p in verified_predictions if p.get('confidence') == 'Low']
            
            def calc_accuracy(preds):
                if not preds:
                    return {'total': 0, 'correct': 0, 'accuracy': 0}
                total_p = len(preds)
                correct_p = sum(1 for p in preds if p.get('prediction_correct'))
                return {
                    'total': total_p,
                    'correct': correct_p,
                    'incorrect': total_p - correct_p,
                    'accuracy_percentage': round((correct_p / total_p * 100), 1) if total_p > 0 else 0
                }
            
            return {
                'overall': {
                    'total': total,
                    'correct': correct,
                    'incorrect': incorrect,
                    'accuracy_percentage': round(accuracy, 1)
                },
                'by_confidence': {
                    'high': calc_accuracy(high_preds),
                    'medium': calc_accuracy(medium_preds),
                    'low': calc_accuracy(low_preds)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting accuracy stats: {e}")
            return None


# Singleton instance
_prediction_service = None

def get_prediction_service(db: AsyncIOMotorDatabase) -> PredictionVerificationService:
    """Get or create prediction verification service instance"""
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionVerificationService(db)
    return _prediction_service
