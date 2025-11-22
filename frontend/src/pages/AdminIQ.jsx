import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminIQ = () => {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iqDetails, setIqDetails] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/odds/all-cached?limit=50`);
      setMatches(response.data.matches || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const fetchIQDetails = async (matchId) => {
    try {
      // Fetch from funbet_iq_predictions collection
      const response = await axios.get(`${API_URL}/api/funbet-iq/match/${matchId}`);
      setIqDetails(response.data.match);
    } catch (error) {
      console.error('Error fetching IQ details:', error);
      setIqDetails(null);
    }
  };

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    fetchIQDetails(match.id);
  };

  const ComponentBreakdown = ({ team, components, totalIQ }) => {
    if (!components) return <div>No component data available</div>;

    const componentData = [
      { name: 'Odds IQ', value: components.odds_iq || 0, weight: 0.20, color: 'bg-blue-500' },
      { name: 'Volume IQ', value: components.volume_iq || 0, weight: 0.20, color: 'bg-green-500' },
      { name: 'Movement IQ', value: components.movement_iq || 0, weight: 0.20, color: 'bg-purple-500' },
      { name: 'Stats IQ', value: components.stats_iq || 0, weight: 0.20, color: 'bg-yellow-500' },
      { name: 'Momentum IQ', value: components.momentum_iq || 0, weight: 0.10, color: 'bg-orange-500' },
      { name: 'H2H IQ', value: components.h2h_iq || 0, weight: 0.10, color: 'bg-red-500' }
    ];

    // Calculate weighted contributions
    const contributions = componentData.map(comp => ({
      ...comp,
      contribution: comp.value * comp.weight
    }));

    const calculatedTotal = contributions.reduce((sum, comp) => sum + comp.contribution, 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-bold">{team}</h3>
          <div className="text-3xl font-bold text-blue-600">{totalIQ}</div>
        </div>

        <div className="space-y-3">
          {contributions.map((comp, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{comp.name}</span>
                <span className="text-gray-600">
                  {comp.value.toFixed(1)} × {(comp.weight * 100)}% = {comp.contribution.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={comp.value} className="flex-1" />
                <span className="text-xs text-gray-500 w-12 text-right">{comp.value.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Calculated Total:</span>
            <span className={calculatedTotal.toFixed(1) === totalIQ.toFixed(1) ? 'text-green-600' : 'text-red-600'}>
              {calculatedTotal.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold mt-2">
            <span>Stored Total:</span>
            <span className="text-blue-600">{totalIQ.toFixed(1)}</span>
          </div>
          {Math.abs(calculatedTotal - totalIQ) < 0.5 ? (
            <Badge className="mt-2 bg-green-500">✓ Formula Verified</Badge>
          ) : (
            <Badge className="mt-2 bg-red-500">✗ Mismatch Detected</Badge>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <div className="font-mono bg-gray-100 p-3 rounded">
            <div>Total IQ = </div>
            {contributions.map((comp, i) => (
              <div key={i} className="ml-4">
                + {(comp.weight * 100)}% × {comp.value.toFixed(1)} = {comp.contribution.toFixed(2)}
              </div>
            ))}
            <div className="border-t mt-2 pt-2 font-bold">
              = {calculatedTotal.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ComponentExplanation = ({ name, value, description }) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
          <Badge variant="outline" className="text-lg">{value.toFixed(1)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{description}</p>
        <div className="mt-3">
          <Progress value={value} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">FunBet IQ Admin - Detailed Calculations</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Match List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Matches ({matches.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[800px] overflow-y-auto space-y-2">
              {matches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => handleMatchSelect(match)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedMatch?.id === match.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm">{match.home_team}</div>
                  <div className="text-xs text-gray-500">vs</div>
                  <div className="font-medium text-sm">{match.away_team}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {match.sport_title || match.sport_key}
                  </div>
                  {match.funbet_iq && (
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-blue-600">Home: {match.funbet_iq.home_iq}</span>
                      <span className="text-red-600">Away: {match.funbet_iq.away_iq}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Detailed View */}
          <div className="lg:col-span-2">
            {!selectedMatch ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <div className="text-xl mb-2">Select a match to view detailed calculations</div>
                  <div className="text-sm">Click on any match from the left panel</div>
                </CardContent>
              </Card>
            ) : !iqDetails ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <div className="text-xl mb-2">No FunBet IQ prediction found</div>
                  <div className="text-sm">This match may not have a prediction yet</div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="breakdown" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="breakdown">Component Breakdown</TabsTrigger>
                  <TabsTrigger value="home">Home Team Details</TabsTrigger>
                  <TabsTrigger value="away">Away Team Details</TabsTrigger>
                </TabsList>

                <TabsContent value="breakdown" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{selectedMatch.home_team} vs {selectedMatch.away_team}</span>
                        <Badge className={
                          iqDetails.confidence === 'High' ? 'bg-green-500' :
                          iqDetails.confidence === 'Medium' ? 'bg-yellow-500' : 'bg-gray-500'
                        }>
                          {iqDetails.confidence} Confidence
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Home IQ</div>
                          <div className="text-4xl font-bold text-blue-600">{iqDetails.home_iq}</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-gray-600">Away IQ</div>
                          <div className="text-4xl font-bold text-red-600">{iqDetails.away_iq}</div>
                        </div>
                      </div>

                      <div className="text-center p-4 bg-gray-100 rounded-lg mb-6">
                        <div className="text-sm text-gray-600 mb-2">Prediction</div>
                        <div className="text-2xl font-bold">
                          {iqDetails.predicted_winner === 'home' ? selectedMatch.home_team :
                           iqDetails.predicted_winner === 'away' ? selectedMatch.away_team : 'Draw'}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">{iqDetails.verdict}</div>
                      </div>

                      {iqDetails.prediction_correct !== undefined && (
                        <div className={`text-center p-4 rounded-lg mb-6 ${
                          iqDetails.prediction_correct ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <div className="text-2xl mb-2">
                            {iqDetails.prediction_correct ? '✅' : '❌'}
                          </div>
                          <div className="font-bold">
                            {iqDetails.prediction_correct ? 'Prediction Correct!' : 'Prediction Incorrect'}
                          </div>
                          <div className="text-sm mt-2">
                            Predicted: {iqDetails.predicted_winner} | Actual: {iqDetails.actual_winner}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded">
                        <div><strong>Calculated at:</strong> {new Date(iqDetails.calculated_at).toLocaleString()}</div>
                        {iqDetails.verified_at && (
                          <div className="mt-1"><strong>Verified at:</strong> {new Date(iqDetails.verified_at).toLocaleString()}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Home Team: {selectedMatch.home_team}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ComponentBreakdown
                          team={selectedMatch.home_team}
                          components={iqDetails.home_components}
                          totalIQ={iqDetails.home_iq}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Away Team: {selectedMatch.away_team}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ComponentBreakdown
                          team={selectedMatch.away_team}
                          components={iqDetails.away_components}
                          totalIQ={iqDetails.away_iq}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="home" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedMatch.home_team} - Component Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ComponentExplanation
                        name="Odds IQ (20%)"
                        value={iqDetails.home_components?.odds_iq || 0}
                        description="Based on market odds and implied probabilities from bookmakers. Lower odds = higher IQ (team is favored)."
                      />
                      <ComponentExplanation
                        name="Volume IQ (20%)"
                        value={iqDetails.home_components?.volume_iq || 0}
                        description="Measures betting volume, number of bookmakers, and market liquidity. More bookmakers with consensus = higher score."
                      />
                      <ComponentExplanation
                        name="Movement IQ (20%)"
                        value={iqDetails.home_components?.movement_iq || 0}
                        description="Tracks how odds have changed. Tight spread = stable market = higher confidence."
                      />
                      <ComponentExplanation
                        name="Team Stats IQ (20%)"
                        value={iqDetails.home_components?.stats_iq || 0}
                        description="Win/loss record, goals scored/conceded, home/away performance, recent form. Higher = better overall performance."
                      />
                      <ComponentExplanation
                        name="Momentum IQ (10%)"
                        value={iqDetails.home_components?.momentum_iq || 0}
                        description="Last 10 games scoring: Home win +3, Draw +2, Away win +5, Unbeaten +2/game, Draw +1. Higher = better recent form."
                      />
                      <ComponentExplanation
                        name="H2H IQ (10%)"
                        value={iqDetails.home_components?.h2h_iq || 0}
                        description="Historical head-to-head results. Win percentage against this specific opponent. 50 = no data."
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="away" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedMatch.away_team} - Component Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ComponentExplanation
                        name="Odds IQ (20%)"
                        value={iqDetails.away_components?.odds_iq || 0}
                        description="Based on market odds and implied probabilities from bookmakers. Lower odds = higher IQ (team is favored)."
                      />
                      <ComponentExplanation
                        name="Volume IQ (20%)"
                        value={iqDetails.away_components?.volume_iq || 0}
                        description="Measures betting volume, number of bookmakers, and market liquidity. More bookmakers with consensus = higher score."
                      />
                      <ComponentExplanation
                        name="Movement IQ (20%)"
                        value={iqDetails.away_components?.movement_iq || 0}
                        description="Tracks how odds have changed. Tight spread = stable market = higher confidence."
                      />
                      <ComponentExplanation
                        name="Team Stats IQ (20%)"
                        value={iqDetails.away_components?.stats_iq || 0}
                        description="Win/loss record, goals scored/conceded, home/away performance, recent form. Higher = better overall performance."
                      />
                      <ComponentExplanation
                        name="Momentum IQ (10%)"
                        value={iqDetails.away_components?.momentum_iq || 0}
                        description="Last 10 games scoring: Home win +3, Draw +2, Away win +5, Unbeaten +2/game, Draw +1. Higher = better recent form."
                      />
                      <ComponentExplanation
                        name="H2H IQ (10%)"
                        value={iqDetails.away_components?.h2h_iq || 0}
                        description="Historical head-to-head results. Win percentage against this specific opponent. 50 = no data."
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIQ;
