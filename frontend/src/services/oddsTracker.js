// Odds Movement Tracker
class OddsTracker {
  constructor() {
    this.previousOdds = new Map();
  }

  /**
   * Track odds changes and return movement indicator
   * @param {string} matchId - Unique match identifier
   * @param {string} outcomeKey - Key for the outcome (home/away/draw)
   * @param {number} currentOdds - Current odds value
   * @returns {object} - Movement data { direction: 'up'|'down'|'stable', change: number }
   */
  trackOddsChange(matchId, outcomeKey, currentOdds) {
    const key = `${matchId}_${outcomeKey}`;
    const previousOdds = this.previousOdds.get(key);
    
    // Store current odds for next comparison
    this.previousOdds.set(key, currentOdds);
    
    if (!previousOdds || previousOdds === currentOdds) {
      return { direction: 'stable', change: 0 };
    }
    
    const change = currentOdds - previousOdds;
    const direction = change > 0 ? 'up' : 'down';
    
    return { direction, change: Math.abs(change) };
  }

  /**
   * Clear tracking data for a specific match
   * @param {string} matchId - Match ID to clear
   */
  clearMatch(matchId) {
    const keysToDelete = [];
    for (const key of this.previousOdds.keys()) {
      if (key.startsWith(matchId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.previousOdds.delete(key));
  }

  /**
   * Clear all tracking data
   */
  clearAll() {
    this.previousOdds.clear();
  }
}

// Create singleton instance
const oddsTracker = new OddsTracker();

export default oddsTracker;
