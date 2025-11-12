// Mock data for FunBet.AI

export const mockLiveScores = [
  {
    id: 1,
    sport: 'Football',
    league: 'Premier League',
    homeTeam: 'Manchester United',
    awayTeam: 'Liverpool',
    homeScore: 2,
    awayScore: 1,
    status: 'Live',
    minute: 67
  },
  {
    id: 2,
    sport: 'Football',
    league: 'La Liga',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    homeScore: 1,
    awayScore: 1,
    status: 'Live',
    minute: 78
  },
  {
    id: 3,
    sport: 'Cricket',
    league: 'IPL',
    homeTeam: 'Mumbai Indians',
    awayTeam: 'Chennai Super Kings',
    homeScore: 187,
    awayScore: '156/7',
    status: 'Live',
    minute: 'Over 17'
  },
  {
    id: 4,
    sport: 'Basketball',
    league: 'NBA',
    homeTeam: 'LA Lakers',
    awayTeam: 'Boston Celtics',
    homeScore: 95,
    awayScore: 88,
    status: 'Live',
    minute: 'Q3 8:45'
  },
  {
    id: 5,
    sport: 'Tennis',
    league: 'Australian Open',
    homeTeam: 'Djokovic',
    awayTeam: 'Nadal',
    homeScore: '2-1',
    awayScore: '6-4 4-6 7-5',
    status: 'Live',
    minute: 'Set 3'
  }
];

export const mockPredictions = [
  {
    id: 1,
    sport: 'Football',
    league: 'Premier League',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    date: '2025-07-20',
    time: '15:00',
    prediction: 'Arsenal Win',
    confidence: 82.5,
    aiOdds: 2.42,
    reasoning: 'Arsenal shows strong home form with 8 wins in last 10 matches. Chelsea struggling away with defensive issues. Historical H2H favors Arsenal at Emirates.',
    stats: {
      homeForm: 'WWWWL',
      awayForm: 'LWLWD',
      h2h: 'Arsenal 3-2 in last 5'
    }
  },
  {
    id: 2,
    sport: 'Cricket',
    league: 'T20 World Cup',
    homeTeam: 'India',
    awayTeam: 'Pakistan',
    date: '2025-07-22',
    time: '19:30',
    prediction: 'India Win',
    confidence: 77.0,
    aiOdds: 1.98,
    reasoning: 'India dominant in recent T20 formats with explosive batting lineup. Pakistan bowling vulnerable in powerplay overs. Pitch conditions favor Indian spinners.',
    stats: {
      homeForm: 'WWWWW',
      awayForm: 'WWLWL',
      h2h: 'India 6-4 in last 10'
    }
  },
  {
    id: 3,
    sport: 'Basketball',
    league: 'NBA Playoffs',
    homeTeam: 'Golden State Warriors',
    awayTeam: 'Phoenix Suns',
    date: '2025-07-21',
    time: '21:00',
    prediction: 'Warriors Win',
    confidence: 88.0,
    aiOdds: 1.76,
    reasoning: 'Warriors excel in playoff experience with championship pedigree. Home court advantage significant at Chase Center. Suns missing key defensive player.',
    stats: {
      homeForm: 'WWWWW',
      awayForm: 'LWWLW',
      h2h: 'Warriors 7-3 in last 10'
    }
  }
];

export const mockStats = {
  premierLeague: [
    { position: 1, team: 'Manchester City', played: 25, won: 18, drawn: 4, lost: 3, gf: 58, ga: 22, gd: 36, points: 58 },
    { position: 2, team: 'Arsenal', played: 25, won: 17, drawn: 5, lost: 3, gf: 54, ga: 24, gd: 30, points: 56 },
    { position: 3, team: 'Liverpool', played: 25, won: 16, drawn: 6, lost: 3, gf: 52, ga: 26, gd: 26, points: 54 },
    { position: 4, team: 'Aston Villa', played: 25, won: 15, drawn: 4, lost: 6, gf: 48, ga: 32, gd: 16, points: 49 },
    { position: 5, team: 'Tottenham', played: 25, won: 14, drawn: 5, lost: 6, gf: 50, ga: 35, gd: 15, points: 47 }
  ],
  laLiga: [
    { position: 1, team: 'Real Madrid', played: 24, won: 18, drawn: 4, lost: 2, gf: 52, ga: 18, gd: 34, points: 58 },
    { position: 2, team: 'Barcelona', played: 24, won: 16, drawn: 5, lost: 3, gf: 48, ga: 22, gd: 26, points: 53 },
    { position: 3, team: 'Atletico Madrid', played: 24, won: 15, drawn: 6, lost: 3, gf: 42, ga: 20, gd: 22, points: 51 },
    { position: 4, team: 'Athletic Bilbao', played: 24, won: 13, drawn: 5, lost: 6, gf: 38, ga: 26, gd: 12, points: 44 },
    { position: 5, team: 'Girona', played: 24, won: 12, drawn: 6, lost: 6, gf: 40, ga: 30, gd: 10, points: 42 }
  ]
};

export const mockNews = [
  {
    id: 1,
    title: 'Premier League Title Race Heats Up',
    summary: 'Manchester City and Arsenal separated by just 2 points as we enter crucial final stretch. Liverpool lurking in third.',
    category: 'Football',
    date: '2025-07-18',
    image: 'https://images.unsplash.com/photo-1516576052-e41d2c6e116e?w=800&q=80'
  },
  {
    id: 2,
    title: 'IPL 2025: Mumbai Indians Dominate',
    summary: 'Mumbai Indians extend winning streak to 8 matches, establishing themselves as favorites for this season\'s championship.',
    category: 'Cricket',
    date: '2025-07-17',
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80'
  },
  {
    id: 3,
    title: 'NBA Playoffs: Upsets and Surprises',
    summary: 'Lower seeds causing major upsets in first round. Warriors and Lakers face unexpected challenges.',
    category: 'Basketball',
    date: '2025-07-16',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80'
  },
  {
    id: 4,
    title: 'Wimbledon: New Generation Emerges',
    summary: 'Young tennis stars challenging established champions. Fresh faces making deep runs in prestigious tournament.',
    category: 'Tennis',
    date: '2025-07-15',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80'
  },
  {
    id: 5,
    title: 'Transfer Window: Record Breaking Deals',
    summary: 'Summer transfer window sees unprecedented spending. Top clubs competing for elite talent across Europe.',
    category: 'Football',
    date: '2025-07-14',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80'
  },
  {
    id: 6,
    title: 'T20 World Cup Preview: Teams to Watch',
    summary: 'Analysis of top contenders for upcoming T20 World Cup. India, England, and Australia lead betting favorites.',
    category: 'Cricket',
    date: '2025-07-13',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80'
  }
];