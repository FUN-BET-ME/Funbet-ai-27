// Team Logo Service - Using reliable logo sources
import { additionalFootballLogos } from './additionalLogos';

const logoCache = new Map();

/**
 * Get team logo URL - USES BACKEND API (auto-fetches and caches forever)
 * @param {string} teamName - Name of the team
 * @param {string} sport - Sport type (football, cricket, basketball, etc.)
 * @returns {Promise<string|null>} - URL of team logo or null
 */
export const getTeamLogo = async (teamName, sport = 'Soccer') => {
  if (!teamName) return null;
  
  // CRICKET: Use country flags instead of logos
  if (sport && sport.toLowerCase().includes('cricket')) {
    return await getCricketFlag(teamName);
  }
  
  // Check cache first
  const cacheKey = `${teamName.toLowerCase()}_${sport.toLowerCase()}`;
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey);
  }
  
  // Use backend API (automatically fetches and caches logos)
  try {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
    const response = await fetch(`${BACKEND_URL}/api/teams/logo/${encodeURIComponent(teamName)}?sport_key=${sport || ''}`);
    
    if (response.ok) {
      const data = await response.json();
      const logoUrl = data.logo_url;
      
      // Cache the result
      logoCache.set(cacheKey, logoUrl);
      return logoUrl;
    }
  } catch (error) {
    console.error(`Error fetching logo for ${teamName}:`, error);
  }
  
  // Fallback to hardcoded database if backend fails
  const cacheKey2 = `${teamName.toLowerCase()}_${sport.toLowerCase()}`;
  if (logoCache.has(cacheKey2)) {
    return logoCache.get(cacheKey2);
  }
  
  // Football team logo database
  const footballLogos = {
    // Premier League
    'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    'Aston Villa': 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Aston_Villa_logo.svg/240px-Aston_Villa_logo.svg.png',
    'Bournemouth': 'https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg',
    'Brentford': 'https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg',
    'Brighton and Hove Albion': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
    'Brighton': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
    'Burnley': 'https://upload.wikimedia.org/wikipedia/en/6/6d/Burnley_FC_Logo.svg',
    'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    'Crystal Palace': 'https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg',
    'Everton': 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
    'Fulham': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg',
    'Ipswich Town': 'https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg',
    'Leeds United': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'Leicester City': 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg',
    'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    'Luton Town': 'https://upload.wikimedia.org/wikipedia/en/8/8b/LutonTownFC2009.svg',
    'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    'Newcastle United': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
    'Nottingham Forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg',
    'Sheffield United': 'https://upload.wikimedia.org/wikipedia/en/9/9c/Sheffield_United_FC_logo.svg',
    'Southampton': 'https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg',
    'Tottenham Hotspur': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'Tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'West Ham United': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
    'West Ham': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
    'Wolverhampton Wanderers': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
    'Wolves': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
    
    // Additional Premier League / Championship
    'Norwich City': 'https://upload.wikimedia.org/wikipedia/en/8/8c/Norwich_City.svg',
    'Watford': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Watford.svg',
    'Cardiff City': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Cardiff_City_crest.svg',
    'Swansea City': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Swansea_City_AFC_logo.svg',
    'Stoke City': 'https://upload.wikimedia.org/wikipedia/en/2/29/Stoke_City_FC.svg',
    'Sunderland': 'https://upload.wikimedia.org/wikipedia/en/7/77/Logo_Sunderland.svg',
    'Middlesbrough': 'https://upload.wikimedia.org/wikipedia/en/2/2c/Middlesbrough_FC_crest.svg',
    'Derby County': 'https://upload.wikimedia.org/wikipedia/en/4/4a/Derby_County_crest.svg',
    'Blackburn Rovers': 'https://upload.wikimedia.org/wikipedia/en/0/0f/Blackburn_Rovers.svg',
    'Queens Park Rangers': 'https://upload.wikimedia.org/wikipedia/en/3/31/Queens_Park_Rangers_crest.svg',
    'QPR': 'https://upload.wikimedia.org/wikipedia/en/3/31/Queens_Park_Rangers_crest.svg',
    'Birmingham City': 'https://upload.wikimedia.org/wikipedia/en/6/68/Birmingham_City_FC_logo.svg',
    'Birmingham': 'https://upload.wikimedia.org/wikipedia/en/6/68/Birmingham_City_FC_logo.svg',
    'Reading': 'https://upload.wikimedia.org/wikipedia/en/1/11/Reading_FC.svg',
    'Norwich': 'https://upload.wikimedia.org/wikipedia/en/8/8c/Norwich_City.svg',
    'Cardiff': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Cardiff_City_crest.svg',
    'Swansea': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Swansea_City_AFC_logo.svg',
    'Derby': 'https://upload.wikimedia.org/wikipedia/en/4/4a/Derby_County_crest.svg',
    'Blackburn': 'https://upload.wikimedia.org/wikipedia/en/0/0f/Blackburn_Rovers.svg',
    'Preston': 'https://upload.wikimedia.org/wikipedia/en/8/82/Preston_North_End_FC.svg',
    'Hull': 'https://upload.wikimedia.org/wikipedia/en/5/54/Hull_City_A.F.C._logo.svg',
    'Coventry': 'https://upload.wikimedia.org/wikipedia/en/9/94/Coventry_City_FC_logo.svg',
    'Plymouth': 'https://upload.wikimedia.org/wikipedia/en/a/a8/Plymouth_Argyle_F.C._logo.svg',
    
    // La Liga
    'Athletic Bilbao': 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg',
    'Athletic Club': 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg',
    'Atletico Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    'Atlético Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
    'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
    'Sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
    'Valencia': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg',
    'Villarreal': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg',
    'Real Betis': 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg',
    'Real Sociedad': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
    'Getafe': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/2922.png',
    'Girona': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/6483.png',
    'Espanyol': 'https://upload.wikimedia.org/wikipedia/en/4/4e/RCD_Espanyol_logo.svg',
    'Osasuna': 'https://upload.wikimedia.org/wikipedia/en/d/db/Osasuna_logo.svg',
    'Celta Vigo': 'https://upload.wikimedia.org/wikipedia/en/1/12/RC_Celta_de_Vigo_logo.svg',
    'Rayo Vallecano': 'https://upload.wikimedia.org/wikipedia/en/1/12/Rayo_Vallecano_logo.svg',
    'Real Valladolid': 'https://upload.wikimedia.org/wikipedia/en/7/7d/Real_Valladolid_Logo.svg',
    'Mallorca': 'https://upload.wikimedia.org/wikipedia/en/e/e0/RCD_Mallorca.svg',
    'Cadiz': 'https://upload.wikimedia.org/wikipedia/en/5/58/C%C3%A1diz_CF_logo.svg',
    'Almeria': 'https://upload.wikimedia.org/wikipedia/en/d/d2/UD_Almeria_logo.svg',
    'Granada': 'https://upload.wikimedia.org/wikipedia/en/d/df/Granada_CF_logo.svg',
    
    // Serie A
    'AC Milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
    'Inter Milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    'Internazionale': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg',
    'AS Roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
    'Roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
    'Napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg',
    'Lazio': 'https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg',
    'Atalanta': 'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg',
    'Fiorentina': 'https://upload.wikimedia.org/wikipedia/commons/d/d2/ACF_Fiorentina.svg',
    'Torino': 'https://upload.wikimedia.org/wikipedia/en/2/2e/Torino_FC_Logo.svg',
    'Udinese': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Udinese_Calcio_logo.svg',
    'Sampdoria': 'https://upload.wikimedia.org/wikipedia/en/9/96/UC_Sampdoria_logo.svg',
    'Bologna': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Bologna_F.C._1909_logo.svg',
    'Sassuolo': 'https://upload.wikimedia.org/wikipedia/en/4/43/U.S._Sassuolo_Calcio_logo.svg',
    'Verona': 'https://upload.wikimedia.org/wikipedia/en/4/47/Hellas_Verona_FC_logo.svg',
    'Cagliari': 'https://upload.wikimedia.org/wikipedia/en/7/73/Cagliari_Calcio_1920.svg',
    'Genoa': 'https://upload.wikimedia.org/wikipedia/en/7/77/Genoa_CFC_logo.svg',
    'Empoli': 'https://upload.wikimedia.org/wikipedia/en/5/55/Empoli_FC_Logo.svg',
    'Monza': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Logo_AC_Monza.svg',
    
    // Bundesliga
    'Bayern Munich': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/132.png',
    'Borussia Dortmund': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/124.png',
    'RB Leipzig': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/11420.png',
    'Bayer Leverkusen': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/133.png',
    'Borussia Monchengladbach': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/134.png',
    'Eintracht Frankfurt': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/125.png',
    'Union Berlin': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/6569.png',
    'SC Freiburg': 'https://upload.wikimedia.org/wikipedia/en/1/16/SC_Freiburg_logo.svg',
    'VfL Wolfsburg': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg',
    'Hoffenheim': 'https://upload.wikimedia.org/wikipedia/commons/6/64/TSG_1899_Hoffenheim_logo.svg',
    'Werder Bremen': 'https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg',
    'FC Koln': 'https://upload.wikimedia.org/wikipedia/en/c/c7/1._FC_K%C3%B6ln_logo.svg',
    'Mainz': 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Logo_Mainz_05.svg',
    'VfB Stuttgart': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg',
    'Augsburg': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/131.png',
    'Hertha Berlin': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Hertha_BSC_Logo_2012.svg',
    
    // Ligue 1
    'Paris Saint Germain': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    'PSG': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    'Marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
    'Lyon': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais_logo.svg',
    'Monaco': 'https://upload.wikimedia.org/wikipedia/en/e/ea/AS_Monaco_FC.svg',
    'Lille': 'https://upload.wikimedia.org/wikipedia/en/6/61/Lille_OSC_logo.svg',
    'Nice': 'https://upload.wikimedia.org/wikipedia/en/a/a4/OGC_Nice_logo.svg',
    'Rennes': 'https://upload.wikimedia.org/wikipedia/en/c/c8/Stade_Rennais_FC.svg',
    'Lens': 'https://upload.wikimedia.org/wikipedia/en/8/8f/RC_Lens_logo.svg',
    'Nantes': 'https://upload.wikimedia.org/wikipedia/en/d/d5/FC_Nantes_logo.svg',
    'Strasbourg': 'https://upload.wikimedia.org/wikipedia/commons/7/73/Racing_Club_Strasbourg_Alsace.svg',
    'Montpellier': 'https://upload.wikimedia.org/wikipedia/en/e/ef/Montpellier_HSC_logo.svg',
    'Reims': 'https://upload.wikimedia.org/wikipedia/en/8/86/Stade_de_Reims_logo.svg',
    'Toulouse': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Toulouse_FC_logo.svg',
    'Brest': 'https://upload.wikimedia.org/wikipedia/en/b/b3/Stade_Brestois_29_logo.svg',
    
    // Champions League / Europa League additional teams
    'Porto': 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg',
    'Benfica': 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
    'Sporting CP': 'https://upload.wikimedia.org/wikipedia/en/3/3e/Sporting_Clube_de_Portugal_%28Logo%29.svg',
    'Ajax': 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
    'PSV': 'https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg',
    'Celtic': 'https://upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC.svg',
    'Rangers': 'https://upload.wikimedia.org/wikipedia/en/4/43/Rangers_FC.svg',
    'Galatasaray': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/570.png',
    'Fenerbahce': 'https://upload.wikimedia.org/wikipedia/en/8/86/Fenerbah%C3%A7e_SK_Logo.svg',
    'Besiktas': 'https://upload.wikimedia.org/wikipedia/commons/8/86/Be%C5%9Fikta%C5%9F_J.K._logo.svg',
    'Club Brugge': 'https://upload.wikimedia.org/wikipedia/en/d/d0/Club_Brugge_KV_logo.svg',
    'FC Kairat': 'https://tmssl.akamaized.net/images/wappen/head/32115.png',
    'Shakhtar Donetsk': 'https://upload.wikimedia.org/wikipedia/en/a/a1/FC_Shakhtar_Donetsk.svg',
    'Dynamo Kyiv': 'https://upload.wikimedia.org/wikipedia/commons/2/23/FC_Dynamo_Kyiv_logo.svg',
    'Red Star Belgrade': 'https://upload.wikimedia.org/wikipedia/en/e/e2/FK_Crvena_Zvezda_logo.svg',
    'Olympiacos': 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympiacos_FC_logo.svg',
    'PAOK': 'https://upload.wikimedia.org/wikipedia/en/1/1f/PAOK_FC_logo.svg',
    
    // Brazilian Serie A
    'Flamengo': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg',
    'Palmeiras': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg',
    'Corinthians': 'https://upload.wikimedia.org/wikipedia/en/5/5a/SC_Corinthians_Paulista.svg',
    'São Paulo': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg',
    'Sao Paulo': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg',
    'Fluminense': 'https://upload.wikimedia.org/wikipedia/en/a/ad/Fluminense_FC_escudo.svg',
    'Atlético Mineiro': 'https://upload.wikimedia.org/wikipedia/en/6/64/Atletico_mineiro_galo.svg',
    'Atletico Mineiro': 'https://upload.wikimedia.org/wikipedia/en/6/64/Atletico_mineiro_galo.svg',
    'Grêmio': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Gremio.svg',
    'Gremio': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Gremio.svg',
    'Internacional': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg',
    'Botafogo': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg',
    'Santos': 'https://upload.wikimedia.org/wikipedia/commons/3/35/Santos_logo.svg',
    'Vasco da Gama': 'https://upload.wikimedia.org/wikipedia/en/a/ac/Logo_Club_de_Regatas_Vasco_da_Gama.svg',
    'Cruzeiro': 'https://upload.wikimedia.org/wikipedia/en/9/98/Cruzeiro_Esporte_Clube_%28logo%29.svg',
    'Bahia': 'https://upload.wikimedia.org/wikipedia/en/2/2c/Esporte_Clube_Bahia_logo.svg',
    'Athletico Paranaense': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Club_Athletico_Paranaense.svg',
    'Fortaleza': 'https://upload.wikimedia.org/wikipedia/commons/4/40/FortalezaEsporteClube.svg',
    'Red Bull Bragantino': 'https://upload.wikimedia.org/wikipedia/en/9/9a/Red_Bull_Bragantino_logo.svg',
    'Atlético Goianiense': 'https://upload.wikimedia.org/wikipedia/en/e/ed/Atletico_Clube_Goianiense.svg',
    'Atletico Goianiense': 'https://upload.wikimedia.org/wikipedia/en/e/ed/Atletico_Clube_Goianiense.svg',
    
    // Argentine Primera División
    'Boca Juniors': 'https://upload.wikimedia.org/wikipedia/commons/4/41/CABJ70.png',
    'River Plate': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg',
    'Racing Club': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Escudo_de_Racing_Club_%282014%29.svg',
    'Independiente': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg',
    'San Lorenzo': 'https://upload.wikimedia.org/wikipedia/commons/7/77/Escudo_del_Club_Atl%C3%A9tico_San_Lorenzo_de_Almagro.svg',
    'Estudiantes': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Escudo_de_Estudiantes_de_La_Plata.svg',
    'Vélez Sarsfield': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Velez_Sarsfield_logo.svg',
    'Velez Sarsfield': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Velez_Sarsfield_logo.svg',
    'Newells Old Boys': 'https://upload.wikimedia.org/wikipedia/commons/8/80/Escudo_del_Club_Atl%C3%A9tico_Newell%27s_Old_Boys_de_Rosario.svg',
    'Rosario Central': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Escudo_del_Club_Atl%C3%A9tico_Rosario_Central.svg',
    'Talleres': 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Escudo_del_Club_Atl%C3%A9tico_Talleres_%28C%C3%B3rdoba%2C_2015%29.svg',
    'Lanús': 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Escudo_del_Club_Atl%C3%A9tico_Lan%C3%BAs.svg',
    'Lanus': 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Escudo_del_Club_Atl%C3%A9tico_Lan%C3%BAs.svg',
    'Argentinos Juniors': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Argentinos_Juniors_-_Logo_2016.svg',
    'Defensa y Justicia': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Escudo_del_Club_Social_y_Deportivo_Defensa_y_Justicia.svg',
    
    // Chilean Primera División
    'Colo-Colo': 'https://upload.wikimedia.org/wikipedia/en/3/32/CSD_Colo-Colo_logo.svg',
    'Universidad de Chile': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Escudo_Universidad_de_Chile_2014.svg',
    'Universidad Católica': 'https://upload.wikimedia.org/wikipedia/en/d/d1/Club_Deportivo_Universidad_Cat%C3%B3lica_logo.svg',
    'Universidad Catolica': 'https://upload.wikimedia.org/wikipedia/en/d/d1/Club_Deportivo_Universidad_Cat%C3%B3lica_logo.svg',
    
    // Colombian Categoría Primera A
    'Atlético Nacional': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Atletico_Nacional_Logo.svg',
    'Atletico Nacional': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Atletico_Nacional_Logo.svg',
    'Millonarios': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Escudo_Millonarios_2019.svg',
    'América de Cali': 'https://upload.wikimedia.org/wikipedia/commons/6/64/Escudo_del_America_de_Cali.svg',
    'America de Cali': 'https://upload.wikimedia.org/wikipedia/commons/6/64/Escudo_del_America_de_Cali.svg',
    'Independiente Medellín': 'https://upload.wikimedia.org/wikipedia/commons/5/53/DIM-2012.svg',
    'Independiente Medellin': 'https://upload.wikimedia.org/wikipedia/commons/5/53/DIM-2012.svg',
    'Junior': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Escudo_del_Club_Deportivo_Popular_Junior.svg',
    'Deportivo Cali': 'https://upload.wikimedia.org/wikipedia/commons/6/66/Escudo_Deportivo_Cali.svg',
    'Santa Fe': 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Escudo_del_Independiente_Santa_Fe.svg',
    
    // Uruguayan Primera División
    'Peñarol': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Escudo_del_Club_Atletico_Penarol.svg',
    'Penarol': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Escudo_del_Club_Atletico_Penarol.svg',
    'Nacional': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Nacional_Montevideo.svg',
    
    // Ecuadorian Serie A
    'Barcelona SC': 'https://upload.wikimedia.org/wikipedia/en/5/53/Barcelona_Sporting_Club_logo.svg',
    'Emelec': 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Club_Sport_Emelec_logo.svg',
    'LDU Quito': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Escudo_LDU_Quito.svg',
    'Independiente del Valle': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Independiente_del_Valle_logo.svg',
    
    // Mexican Liga MX
    'Club América': 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Club_America_logo.svg',
    'Club America': 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Club_America_logo.svg',
    'Chivas': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Guadalajara_Logo.svg',
    'Guadalajara': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Guadalajara_Logo.svg',
    'Cruz Azul': 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Escudo_Cruz_Azul_2014.svg',
    'Pumas UNAM': 'https://upload.wikimedia.org/wikipedia/en/f/f8/Club_Universidad_Nacional_Logo.svg',
    'Tigres UANL': 'https://upload.wikimedia.org/wikipedia/en/6/63/Club_de_F%C3%BAtbol_Tigres_de_la_UANL_logo.svg',
    'Monterrey': 'https://upload.wikimedia.org/wikipedia/en/e/e3/Club_de_F%C3%BAtbol_Monterrey_logo.svg',
    'Santos Laguna': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Santos_Laguna_logo.svg',
    'Toluca': 'https://upload.wikimedia.org/wikipedia/en/2/22/Deportivo_Toluca_F.C._logo.svg',
    'Atlas': 'https://upload.wikimedia.org/wikipedia/en/d/dc/Atlas_FC_logo.svg',
    'León': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Club_Le%C3%B3n_logo.svg',
    'Leon': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Club_Le%C3%B3n_logo.svg',
    'Puebla': 'https://upload.wikimedia.org/wikipedia/en/d/d1/Club_Puebla_logo.svg',
    'Pachuca': 'https://upload.wikimedia.org/wikipedia/en/7/7f/C.F._Pachuca_logo.svg',
    'Necaxa': 'https://upload.wikimedia.org/wikipedia/en/4/4d/Club_Necaxa_logo.svg',
    
    // Asian Leagues - Saudi Pro League
    'Al-Hilal': 'https://upload.wikimedia.org/wikipedia/en/4/4b/Al_Hilal_Saudi_FC_Logo.svg',
    'Al Hilal': 'https://upload.wikimedia.org/wikipedia/en/4/4b/Al_Hilal_Saudi_FC_Logo.svg',
    'Al-Nassr': 'https://upload.wikimedia.org/wikipedia/en/1/17/Al-Nassr_FC_Logo.svg',
    'Al Nassr': 'https://upload.wikimedia.org/wikipedia/en/1/17/Al-Nassr_FC_Logo.svg',
    'Al-Ittihad': 'https://upload.wikimedia.org/wikipedia/en/1/1a/Al-Ittihad_Club_Logo.svg',
    'Al Ittihad': 'https://upload.wikimedia.org/wikipedia/en/1/1a/Al-Ittihad_Club_Logo.svg',
    'Al-Ahli': 'https://upload.wikimedia.org/wikipedia/en/1/17/Al-Ahli_Saudi_FC.svg',
    'Al Ahli': 'https://upload.wikimedia.org/wikipedia/en/1/17/Al-Ahli_Saudi_FC.svg',
    'Al-Ettifaq': 'https://upload.wikimedia.org/wikipedia/en/9/95/Ettifaq_FC_logo.svg',
    'Al Ettifaq': 'https://upload.wikimedia.org/wikipedia/en/9/95/Ettifaq_FC_logo.svg',
    'Al-Taawoun': 'https://upload.wikimedia.org/wikipedia/en/d/d2/Al-Taawoun_FC_logo.svg',
    'Al Taawoun': 'https://upload.wikimedia.org/wikipedia/en/d/d2/Al-Taawoun_FC_logo.svg',
    'Al-Shabab': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Al-Shabab_FC_%28Riyadh%29_logo.svg',
    'Al Shabab': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Al-Shabab_FC_%28Riyadh%29_logo.svg',
    'Al-Fateh': 'https://upload.wikimedia.org/wikipedia/en/a/a0/Al-Fateh_SC_logo.svg',
    'Al Fateh': 'https://upload.wikimedia.org/wikipedia/en/a/a0/Al-Fateh_SC_logo.svg',
    
    // Japanese J-League
    'Kashima Antlers': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Kashima_Antlers_logo.svg',
    'Urawa Red Diamonds': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Urawa_Red_Diamonds_logo.svg',
    'Yokohama F. Marinos': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Yokohama_F._Marinos_logo.svg',
    'Kawasaki Frontale': 'https://upload.wikimedia.org/wikipedia/en/7/78/Kawasaki_Frontale_logo.svg',
    'Gamba Osaka': 'https://upload.wikimedia.org/wikipedia/en/4/4f/Gamba_Osaka_logo.svg',
    'FC Tokyo': 'https://upload.wikimedia.org/wikipedia/en/6/66/FC_Tokyo_logo.svg',
    'Cerezo Osaka': 'https://upload.wikimedia.org/wikipedia/en/e/ec/Cerezo_Osaka_logo.svg',
    'Vissel Kobe': 'https://upload.wikimedia.org/wikipedia/en/2/2c/Vissel_Kobe_logo.svg',
    
    // South Korean K-League
    'Jeonbuk Hyundai Motors': 'https://upload.wikimedia.org/wikipedia/en/e/e7/Jeonbuk_Hyundai_Motors_FC_logo.svg',
    'Ulsan Hyundai': 'https://upload.wikimedia.org/wikipedia/en/4/4f/Ulsan_Hyundai_FC_logo.svg',
    'Suwon Samsung Bluewings': 'https://upload.wikimedia.org/wikipedia/en/b/ba/Suwon_Samsung_Bluewings_FC.svg',
    'FC Seoul': 'https://upload.wikimedia.org/wikipedia/en/6/6d/FC_Seoul_logo.svg',
    'Pohang Steelers': 'https://upload.wikimedia.org/wikipedia/en/7/71/Pohang_Steelers_FC.svg',
    
    // Chinese Super League
    'Shanghai Port': 'https://upload.wikimedia.org/wikipedia/en/2/26/Shanghai_Port_FC_logo.svg',
    'Guangzhou FC': 'https://upload.wikimedia.org/wikipedia/en/5/58/Guangzhou_F.C._logo.svg',
    'Beijing Guoan': 'https://upload.wikimedia.org/wikipedia/en/5/50/Beijing_Guoan_F.C._logo.svg',
    'Shandong Taishan': 'https://upload.wikimedia.org/wikipedia/en/f/fa/Shandong_Taishan_F.C._logo.svg',
    
    // UAE Pro League
    'Al Ain': 'https://upload.wikimedia.org/wikipedia/en/1/10/Al_Ain_FC_logo.svg',
    'Al Wahda': 'https://upload.wikimedia.org/wikipedia/en/8/8e/Al_Wahda_FC_logo.svg',
    'Sharjah': 'https://upload.wikimedia.org/wikipedia/en/6/6d/Sharjah_FC_logo.svg',
    'Al Jazira': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Al_Jazira_Club_logo.svg',
    
    // Qatar Stars League
    'Al Sadd': 'https://upload.wikimedia.org/wikipedia/en/9/9d/Al_Sadd_SC_logo.svg',
    'Al Duhail': 'https://upload.wikimedia.org/wikipedia/en/0/02/Al-Duhail_SC_logo.svg',
    'Al Rayyan': 'https://upload.wikimedia.org/wikipedia/en/1/11/Al-Rayyan_SC_logo.svg',
    'Al Arabi': 'https://upload.wikimedia.org/wikipedia/en/4/42/Al-Arabi_SC_%28Qatar%29_logo.svg',
    
    // Indian Super League
    'Mumbai City': 'https://upload.wikimedia.org/wikipedia/en/a/a5/Mumbai_City_FC_logo.svg',
    'Bengaluru FC': 'https://upload.wikimedia.org/wikipedia/en/f/f6/Bengaluru_FC_logo.svg',
    'ATK Mohun Bagan': 'https://upload.wikimedia.org/wikipedia/en/e/e8/ATK_Mohun_Bagan_FC_Logo.svg',
    'Hyderabad FC': 'https://upload.wikimedia.org/wikipedia/en/4/49/Hyderabad_FC_logo.svg',
    
    // African Leagues - Egyptian Premier League
    'Al Ahly': 'https://upload.wikimedia.org/wikipedia/en/e/ef/Al_Ahly_SC_logo.svg',
    'Zamalek': 'https://upload.wikimedia.org/wikipedia/en/c/c8/Zamalek_SC_logo.svg',
    'Pyramids FC': 'https://upload.wikimedia.org/wikipedia/en/e/ea/Pyramids_FC_logo.svg',
    
    // South African Premier Division
    'Mamelodi Sundowns': 'https://upload.wikimedia.org/wikipedia/en/e/ef/Mamelodi_Sundowns_FC_logo.svg',
    'Kaizer Chiefs': 'https://upload.wikimedia.org/wikipedia/en/e/e9/Kaizer_Chiefs_Logo.svg',
    'Orlando Pirates': 'https://upload.wikimedia.org/wikipedia/en/f/f0/Orlando_Pirates_FC_logo.svg',
    
    // Moroccan Botola
    'Raja Casablanca': 'https://upload.wikimedia.org/wikipedia/en/e/ea/Raja_CA_logo.svg',
    'Wydad Casablanca': 'https://upload.wikimedia.org/wikipedia/en/d/d1/Wydad_AC_logo.svg',
    
    // Tunisian Ligue Professionnelle 1
    'Espérance de Tunis': 'https://upload.wikimedia.org/wikipedia/en/2/2b/Esperance_Sportive_de_Tunis_logo.svg',
    'Esperance de Tunis': 'https://upload.wikimedia.org/wikipedia/en/2/2b/Esperance_Sportive_de_Tunis_logo.svg',
    'Club Africain': 'https://upload.wikimedia.org/wikipedia/en/2/21/Club_Africain_logo.svg',
    
    // Nigerian Professional Football League
    'Enyimba': 'https://upload.wikimedia.org/wikipedia/en/4/42/Enyimba_International_F.C._logo.svg',
    
    // National Teams (World Cup Qualifiers & Friendlies)
    'England': 'https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg',
    'France': 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    'Germany': 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg',
    'Spain': 'https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg',
    'Italy': 'https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg',
    'Portugal': 'https://upload.wikimedia.org/wikipedia/en/5/5c/Flag_of_Portugal.svg',
    'Netherlands': 'https://upload.wikimedia.org/wikipedia/en/2/20/Flag_of_the_Netherlands.svg',
    'Belgium': 'https://upload.wikimedia.org/wikipedia/en/9/92/Flag_of_Belgium_%28civil%29.svg',
    'Croatia': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Croatia.svg',
    'Switzerland': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Flag_of_Switzerland_%28Pantone%29.svg',
    'Denmark': 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg',
    'Sweden': 'https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg',
    'Poland': 'https://upload.wikimedia.org/wikipedia/en/1/12/Flag_of_Poland.svg',
    'Ukraine': 'https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg',
    'Austria': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg',
    'Czech Republic': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_Czech_Republic.svg',
    'Serbia': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Flag_of_Serbia.svg',
    'Romania': 'https://upload.wikimedia.org/wikipedia/commons/7/73/Flag_of_Romania.svg',
    'Scotland': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg',
    'Wales': 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Flag_of_Wales.svg',
    'Republic of Ireland': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg',
    'Ireland': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_Ireland.svg',
    'Northern Ireland': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Northern_Ireland.svg',
    'Norway': 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg',
    'Finland': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Finland.svg',
    'Iceland': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Iceland.svg',
    'Turkey': 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg',
    'Russia': 'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg',
    'Greece': 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg',
    
    // South American National Teams
    'Brazil': 'https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg',
    'Argentina': 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    'Uruguay': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Uruguay.svg',
    'Colombia': 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg',
    'Chile': 'https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg',
    'Paraguay': 'https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg',
    'Peru': 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg',
    'Ecuador': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg',
    'Bolivia': 'https://upload.wikimedia.org/wikipedia/commons/4/48/Flag_of_Bolivia.svg',
    'Venezuela': 'https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Venezuela.svg',
    
    // North & Central American National Teams
    'United States': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    'USA': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    'Mexico': 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg',
    'Canada': 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Canada_%28Pantone%29.svg',
    'Costa Rica': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Costa_Rica_%28state%29.svg',
    'Jamaica': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Flag_of_Jamaica.svg',
    'Panama': 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Flag_of_Panama.svg',
    'Honduras': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Flag_of_Honduras.svg',
    
    // Asian National Teams
    'Japan': 'https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg',
    'South Korea': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg',
    'Iran': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Flag_of_Iran.svg',
    'Saudi Arabia': 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg',
    'Qatar': 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg',
    'Iraq': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Iraq.svg',
    'United Arab Emirates': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg',
    'UAE': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg',
    'China': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg',
    'Thailand': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Thailand.svg',
    'Vietnam': 'https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg',
    'Indonesia': 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Flag_of_Indonesia.svg',
    'Malaysia': 'https://upload.wikimedia.org/wikipedia/commons/6/66/Flag_of_Malaysia.svg',
    'Uzbekistan': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg',
    'Jordan': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Flag_of_Jordan.svg',
    'Oman': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg',
    'Syria': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Flag_of_Syria.svg',
    'Lebanon': 'https://upload.wikimedia.org/wikipedia/commons/5/59/Flag_of_Lebanon.svg',
    'Palestine': 'https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Palestine.svg',
    
    // African National Teams
    'Nigeria': 'https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg',
    'Senegal': 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg',
    'Morocco': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg',
    'Egypt': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Egypt.svg',
    'Tunisia': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg',
    'Algeria': 'https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg',
    'Cameroon': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Flag_of_Cameroon.svg',
    'Ghana': 'https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg',
    'Ivory Coast': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg',
    'Côte d\'Ivoire': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg',
    'Mali': 'https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Mali.svg',
    'Burkina Faso': 'https://upload.wikimedia.org/wikipedia/commons/3/31/Flag_of_Burkina_Faso.svg',
    'South Africa': 'https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg',
    'Congo DR': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Flag_of_the_Democratic_Republic_of_the_Congo.svg',
    'Angola': 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Angola.svg',
    
    // Oceania National Teams
    'Australia': 'https://upload.wikimedia.org/wikipedia/commons/8/88/Flag_of_Australia_%28converted%29.svg',
    'New Zealand': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg',
    
    // ADDITIONAL TEAMS - MAJOR EUROPEAN LEAGUES
    // ENGLAND - Championship
    'Leeds United': 'https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg',
    'Sheffield Wednesday': 'https://upload.wikimedia.org/wikipedia/en/8/88/Sheffield_Wednesday_badge.svg',
    'Ipswich Town': 'https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg',
    'West Brom': 'https://upload.wikimedia.org/wikipedia/en/8/8b/West_Bromwich_Albion.svg',
    'Coventry City': 'https://upload.wikimedia.org/wikipedia/en/9/94/Coventry_City_FC_logo.svg',
    'Plymouth Argyle': 'https://upload.wikimedia.org/wikipedia/en/a/a8/Plymouth_Argyle_F.C._logo.svg',
    'Bristol City': 'https://upload.wikimedia.org/wikipedia/en/f/f5/Bristol_City_crest.svg',
    'Millwall': 'https://upload.wikimedia.org/wikipedia/en/7/74/Millwall_F.C._logo.svg',
    'Hull City': 'https://upload.wikimedia.org/wikipedia/en/5/54/Hull_City_A.F.C._logo.svg',
    'Preston North End': 'https://upload.wikimedia.org/wikipedia/en/8/82/Preston_North_End_FC.svg',
    'Huddersfield Town': 'https://upload.wikimedia.org/wikipedia/en/7/7d/Huddersfield_Town_A.F.C._logo.svg',
    'Portsmouth': 'https://upload.wikimedia.org/wikipedia/en/3/38/Portsmouth_FC_logo.svg',
    
    // SPAIN - Complete Coverage
    'Levante': 'https://upload.wikimedia.org/wikipedia/en/7/7b/Levante_Uni%C3%B3n_Deportiva%2C_S.A.D._logo.svg',
    'Real Zaragoza': 'https://upload.wikimedia.org/wikipedia/en/f/f5/Real_Zaragoza_logo.svg',
    'Eibar': 'https://upload.wikimedia.org/wikipedia/en/8/8d/SD_Eibar_logo.svg',
    
    // GERMANY - Complete Bundesliga
    'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    'Borussia Monchengladbach': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Borussia_M%C3%B6nchengladbach_logo.svg',
    'Hoffenheim': 'https://upload.wikimedia.org/wikipedia/commons/e/e7/TSG_1899_Hoffenheim_logo.svg',
    'Augsburg': 'https://upload.wikimedia.org/wikipedia/en/a/a4/FC_Augsburg_logo.svg',
    'Stuttgart': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg',
    'Werder Bremen': 'https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg',
    'Bochum': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/VfL_Bochum_logo.svg',
    'Heidenheim': 'https://upload.wikimedia.org/wikipedia/commons/3/37/FC_Heidenheim_1846_logo.svg',
    'Darmstadt': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/SV_Darmstadt_98.svg',
    'Hamburg': 'https://upload.wikimedia.org/wikipedia/commons/6/66/HSV-Logo.svg',
    'Hamburger SV': 'https://upload.wikimedia.org/wikipedia/commons/6/66/HSV-Logo.svg',
    'Schalke 04': 'https://upload.wikimedia.org/wikipedia/commons/6/6d/FC_Schalke_04_Logo.svg',
    'Hertha BSC': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Hertha_BSC_Logo_2012.svg',
    'Hannover 96': 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Hannover_96_Logo.svg',
    
    // ITALY - Serie B
    'Parma': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Parma_Calcio_1913_logo.svg',
    'Cremonese': 'https://upload.wikimedia.org/wikipedia/en/d/d0/US_Cremonese_logo.svg',
    'Bari': 'https://upload.wikimedia.org/wikipedia/en/3/34/SSC_Bari_logo.svg',
    'Venezia': 'https://upload.wikimedia.org/wikipedia/en/9/9f/Venezia_FC_logo.svg',
    'Sampdoria': 'https://upload.wikimedia.org/wikipedia/en/9/9f/UC_Sampdoria_logo.svg',
    'Palermo': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Palermo_FC_logo.svg',
    'Brescia': 'https://upload.wikimedia.org/wikipedia/en/b/b7/Brescia_Calcio_logo.svg',
    'Como': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Como_1907.svg',
    
    // FRANCE - Complete Coverage
    'Auxerre': 'https://upload.wikimedia.org/wikipedia/en/f/f0/AJ_Auxerre_logo.svg',
    'Angers': 'https://upload.wikimedia.org/wikipedia/en/3/30/Angers_SCO_logo.svg',
    'Troyes': 'https://upload.wikimedia.org/wikipedia/en/3/34/ES_Troyes_AC_logo.svg',
    
    // NETHERLANDS - Eredivisie Complete
    'AZ Alkmaar': 'https://upload.wikimedia.org/wikipedia/en/4/47/AZ_Alkmaar_logo.svg',
    'FC Twente': 'https://upload.wikimedia.org/wikipedia/en/e/e3/FC_Twente.svg',
    'FC Utrecht': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/FC_Utrecht.svg',
    'Go Ahead Eagles': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Go_Ahead_Eagles_logo.svg',
    'Sparta Rotterdam': 'https://upload.wikimedia.org/wikipedia/en/7/70/Sparta_Rotterdam_logo.svg',
    'Vitesse': 'https://upload.wikimedia.org/wikipedia/en/f/f4/SBV_Vitesse_logo.svg',
    'Fortuna Sittard': 'https://upload.wikimedia.org/wikipedia/en/e/e7/Fortuna_Sittard_logo.svg',
    
    // PORTUGAL - Complete
    'FC Porto': 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg',
    'Sporting Lisbon': 'https://upload.wikimedia.org/wikipedia/en/3/3e/Sporting_Clube_de_Portugal_%28Logo%29.svg',
    'SC Braga': 'https://upload.wikimedia.org/wikipedia/en/7/79/S.C._Braga_logo.svg',
    'Vitoria Guimaraes': 'https://upload.wikimedia.org/wikipedia/en/c/cd/Vitoria_Guimaraes.svg',
    'Boavista': 'https://upload.wikimedia.org/wikipedia/en/6/6d/Boavista_FC_logo.svg',
    'Rio Ave': 'https://upload.wikimedia.org/wikipedia/en/e/e3/Rio_Ave_FC_logo.svg',
    'Gil Vicente': 'https://upload.wikimedia.org/wikipedia/en/5/5b/Gil_Vicente_F.C._logo.svg',
    
    // BELGIUM - Pro League
    'Anderlecht': 'https://upload.wikimedia.org/wikipedia/en/e/e8/RSC_Anderlecht_logo.svg',
    'RSC Anderlecht': 'https://upload.wikimedia.org/wikipedia/en/e/e8/RSC_Anderlecht_logo.svg',
    'Union Saint-Gilloise': 'https://upload.wikimedia.org/wikipedia/en/e/ea/Royale_Union_Saint-Gilloise_logo.svg',
    'Royal Antwerp': 'https://upload.wikimedia.org/wikipedia/en/c/cb/Royal_Antwerp_FC_logo.svg',
    'KRC Genk': 'https://upload.wikimedia.org/wikipedia/en/8/89/KRC_Genk_logo.svg',
    'Standard Liege': 'https://upload.wikimedia.org/wikipedia/en/3/32/Standard_Li%C3%A8ge_logo.svg',
    'KAA Gent': 'https://upload.wikimedia.org/wikipedia/en/a/ae/KAA_Gent_logo.svg',
    
    // TURKEY - Süper Lig
    'Trabzonspor': 'https://upload.wikimedia.org/wikipedia/en/9/97/Trabzonspor_logo.svg',
    'Basaksehir': 'https://upload.wikimedia.org/wikipedia/en/5/56/%C4%B0stanbul_Ba%C5%9Fak%C5%9Fehir_logo.svg',
    'Sivasspor': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Sivasspor_Logo.svg',
    
    // SCOTLAND - Premiership
    'Aberdeen': 'https://upload.wikimedia.org/wikipedia/en/d/d3/Aberdeen_FC_logo.svg',
    'Hearts': 'https://upload.wikimedia.org/wikipedia/en/f/f7/Heart_of_Midlothian_FC_logo.svg',
    'Hibernian': 'https://upload.wikimedia.org/wikipedia/en/8/89/Hibernian_FC_logo.svg',
    'Dundee United': 'https://upload.wikimedia.org/wikipedia/en/b/ba/Dundee_United_FC_logo.svg',
    
    // AUSTRIA - Bundesliga
    'Red Bull Salzburg': 'https://upload.wikimedia.org/wikipedia/en/7/77/FC_Red_Bull_Salzburg_logo.svg',
    'Salzburg': 'https://upload.wikimedia.org/wikipedia/en/7/77/FC_Red_Bull_Salzburg_logo.svg',
    'Sturm Graz': 'https://upload.wikimedia.org/wikipedia/commons/c/cd/SK_Sturm_Graz_Logo.svg',
    'Rapid Vienna': 'https://upload.wikimedia.org/wikipedia/en/d/d7/SK_Rapid_Wien_Logo.svg',
    'LASK': 'https://upload.wikimedia.org/wikipedia/en/d/d3/LASK_Linz_logo.svg',
    
    // SWITZERLAND
    'Young Boys': 'https://upload.wikimedia.org/wikipedia/en/c/c6/BSC_Young_Boys_logo.svg',
    'FC Basel': 'https://upload.wikimedia.org/wikipedia/en/9/92/FC_Basel_logo.svg',
    'Zurich': 'https://upload.wikimedia.org/wikipedia/en/2/29/FC_Z%C3%BCrich_logo.svg',
    
    // DENMARK - Superliga
    'Copenhagen': 'https://upload.wikimedia.org/wikipedia/en/7/7a/FC_Copenhagen_logo.svg',
    'Brondby': 'https://upload.wikimedia.org/wikipedia/en/6/62/Brondby_IF_logo.svg',
    'Midtjylland': 'https://upload.wikimedia.org/wikipedia/en/0/04/FC_Midtjylland_logo.svg',
    
    // POLAND - Ekstraklasa
    'Legia Warsaw': 'https://upload.wikimedia.org/wikipedia/en/a/a5/Legia_Warszawa.svg',
    'Lech Poznan': 'https://upload.wikimedia.org/wikipedia/en/b/b5/Lech_Pozna%C5%84.svg',
    'Rakow Czestochowa': 'https://upload.wikimedia.org/wikipedia/en/3/30/Raków_Częstochowa_logo.svg',
    
    // CZECH REPUBLIC
    'Slavia Prague': 'https://upload.wikimedia.org/wikipedia/en/d/d1/SK_Slavia_Praha_logo.svg',
    'Sparta Prague': 'https://upload.wikimedia.org/wikipedia/en/5/51/AC_Sparta_Prague_logo.svg',
    'Viktoria Plzen': 'https://upload.wikimedia.org/wikipedia/en/9/90/FC_Viktoria_Plzeň_logo.svg',
    
    // SERBIA
    'Partizan Belgrade': 'https://upload.wikimedia.org/wikipedia/en/8/8c/FK_Partizan_logo.svg',
    
    // CROATIA
    'Dinamo Zagreb': 'https://upload.wikimedia.org/wikipedia/en/5/55/GNK_Dinamo_Zagreb_logo.svg',
    'Hajduk Split': 'https://upload.wikimedia.org/wikipedia/en/3/30/HNK_Hajduk_Split_logo.svg',
    
    // NORWAY
    'Molde': 'https://upload.wikimedia.org/wikipedia/en/3/3c/Molde_FK_logo.svg',
    'Rosenborg': 'https://upload.wikimedia.org/wikipedia/en/d/de/Rosenborg_BK_logo.svg',
    'Bodo/Glimt': 'https://upload.wikimedia.org/wikipedia/en/f/f8/FK_Bod%C3%B8_Glimt_logo.svg',
    
    // SWEDEN
    'Malmo FF': 'https://upload.wikimedia.org/wikipedia/en/e/ef/Malm%C3%B6_FF_logo.svg',
    'AIK': 'https://upload.wikimedia.org/wikipedia/en/5/5d/AIK_logo.svg',
    'Hammarby': 'https://upload.wikimedia.org/wikipedia/en/e/e7/Hammarby_IF_logo.svg',
    
    // KAZAKHSTAN
    'Kairat Almaty': 'https://tmssl.akamaized.net/images/wappen/head/32115.png',
    
    // ROMANIA
    'FCSB': 'https://upload.wikimedia.org/wikipedia/en/5/58/FCSB_logo.svg',
    'CFR Cluj': 'https://upload.wikimedia.org/wikipedia/en/e/ee/CFR_Cluj_logo.svg',
    
    // BULGARIA
    'Ludogorets': 'https://upload.wikimedia.org/wikipedia/en/3/3e/PFC_Ludogorets_Razgrad_logo.svg',
    
    // ENGLAND - League One & Two
    'Barnsley': 'https://upload.wikimedia.org/wikipedia/en/c/c9/Barnsley_FC.svg',
    'Northampton Town': 'https://upload.wikimedia.org/wikipedia/en/e/e8/Northampton_Town_FC_logo.svg',
    'Northampton': 'https://upload.wikimedia.org/wikipedia/en/e/e8/Northampton_Town_FC_logo.svg',
    'Bolton Wanderers': 'https://upload.wikimedia.org/wikipedia/en/8/82/Bolton_Wanderers_FC_logo.svg',
    'Bolton': 'https://upload.wikimedia.org/wikipedia/en/8/82/Bolton_Wanderers_FC_logo.svg',
    'Stevenage': 'https://upload.wikimedia.org/wikipedia/en/9/9c/Stevenage_FC.svg',
    'Burton Albion': 'https://upload.wikimedia.org/wikipedia/en/5/53/Burton_Albion_FC_logo.svg',
    'Burton': 'https://upload.wikimedia.org/wikipedia/en/5/53/Burton_Albion_FC_logo.svg',
    'Blackpool': 'https://upload.wikimedia.org/wikipedia/en/d/df/Blackpool_FC_logo.svg',
    
    // MERGE ADDITIONAL LOGOS
    ...additionalFootballLogos
  };
  
  // Check if football team has logo mapping
  const isFootball = sport && (
    sport.toLowerCase().includes('soccer') || 
    sport.toLowerCase().includes('football') || 
    sport.toLowerCase().includes('epl') ||
    sport.toLowerCase().includes('premier league') ||
    sport.toLowerCase().includes('la liga') ||
    sport.toLowerCase().includes('serie a') ||
    sport.toLowerCase().includes('bundesliga') ||
    sport.toLowerCase().includes('ligue 1') ||
    sport.toLowerCase().includes('mls') ||
    sport.toLowerCase().includes('liga mx')
  );
  
  if (isFootball) {
    // Try exact match first
    let logo = footballLogos[teamName];
    
    // If no exact match, try flexible matching
    if (!logo) {
      // Normalize team name for matching
      const normalizedSearch = teamName.toLowerCase().trim();
      
      // Try to find a partial match
      for (const [key, value] of Object.entries(footballLogos)) {
        const normalizedKey = key.toLowerCase().trim();
        if (normalizedSearch.includes(normalizedKey) || normalizedKey.includes(normalizedSearch)) {
          logo = value;
          break;
        }
      }
    }
    
    if (logo) {
      logoCache.set(cacheKey, logo);
      return logo;
    }
    
    // No logo found, return null for fallback icon
    logoCache.set(cacheKey, null);
    return null;
  }
  
  // ESPN team ID mappings (NBA, NFL, NHL, MLB)
  const espnTeamIds = {
    // NBA Teams
    'Atlanta Hawks': { league: 'nba', id: 1 },
    'Boston Celtics': { league: 'nba', id: 2 },
    'Brooklyn Nets': { league: 'nba', id: 17 },
    'Charlotte Hornets': { league: 'nba', id: 30 },
    'Chicago Bulls': { league: 'nba', id: 4 },
    'Cleveland Cavaliers': { league: 'nba', id: 5 },
    'Dallas Mavericks': { league: 'nba', id: 6 },
    'Denver Nuggets': { league: 'nba', id: 7 },
    'Detroit Pistons': { league: 'nba', id: 8 },
    'Golden State Warriors': { league: 'nba', id: 9 },
    'Houston Rockets': { league: 'nba', id: 10 },
    'Indiana Pacers': { league: 'nba', id: 11 },
    'LA Clippers': { league: 'nba', id: 12 },
    'Los Angeles Clippers': { league: 'nba', id: 12 },
    'Los Angeles Lakers': { league: 'nba', id: 13 },
    'LA Lakers': { league: 'nba', id: 13 },
    'Memphis Grizzlies': { league: 'nba', id: 29 },
    'Miami Heat': { league: 'nba', id: 14 },
    'Milwaukee Bucks': { league: 'nba', id: 15 },
    'Minnesota Timberwolves': { league: 'nba', id: 16 },
    'New Orleans Pelicans': { league: 'nba', id: 3 },
    'New York Knicks': { league: 'nba', id: 18 },
    'Oklahoma City Thunder': { league: 'nba', id: 25 },
    'Orlando Magic': { league: 'nba', id: 19 },
    'Philadelphia 76ers': { league: 'nba', id: 20 },
    'Phoenix Suns': { league: 'nba', id: 21 },
    'Portland Trail Blazers': { league: 'nba', id: 22 },
    'Sacramento Kings': { league: 'nba', id: 23 },
    'San Antonio Spurs': { league: 'nba', id: 24 },
    'Toronto Raptors': { league: 'nba', id: 28 },
    'Utah Jazz': { league: 'nba', id: 26 },
    'Washington Wizards': { league: 'nba', id: 27 },
    
    // NHL Teams
    'Anaheim Ducks': { league: 'nhl', id: 24 },
    'Arizona Coyotes': { league: 'nhl', id: 53 },
    'Boston Bruins': { league: 'nhl', id: 6 },
    'Buffalo Sabres': { league: 'nhl', id: 7 },
    'Calgary Flames': { league: 'nhl', id: 20 },
    'Carolina Hurricanes': { league: 'nhl', id: 12 },
    'Chicago Blackhawks': { league: 'nhl', id: 16 },
    'Colorado Avalanche': { league: 'nhl', id: 21 },
    'Columbus Blue Jackets': { league: 'nhl', id: 29 },
    'Dallas Stars': { league: 'nhl', id: 25 },
    'Detroit Red Wings': { league: 'nhl', id: 17 },
    'Edmonton Oilers': { league: 'nhl', id: 22 },
    'Florida Panthers': { league: 'nhl', id: 13 },
    'Los Angeles Kings': { league: 'nhl', id: 26 },
    'Minnesota Wild': { league: 'nhl', id: 30 },
    'Montreal Canadiens': { league: 'nhl', id: 8 },
    'Nashville Predators': { league: 'nhl', id: 18 },
    'New Jersey Devils': { league: 'nhl', id: 1 },
    'New York Islanders': { league: 'nhl', id: 2 },
    'New York Rangers': { league: 'nhl', id: 3 },
    'Ottawa Senators': { league: 'nhl', id: 9 },
    'Philadelphia Flyers': { league: 'nhl', id: 4 },
    'Pittsburgh Penguins': { league: 'nhl', id: 5 },
    'San Jose Sharks': { league: 'nhl', id: 28 },
    'Seattle Kraken': { league: 'nhl', id: 55 },
    'St. Louis Blues': { league: 'nhl', id: 19 },
    'Tampa Bay Lightning': { league: 'nhl', id: 14 },
    'Toronto Maple Leafs': { league: 'nhl', id: 10 },
    'Vancouver Canucks': { league: 'nhl', id: 23 },
    'Vegas Golden Knights': { league: 'nhl', id: 54 },
    'Washington Capitals': { league: 'nhl', id: 15 },
    'Winnipeg Jets': { league: 'nhl', id: 52 }
  };
  
  // Check if we have ESPN mapping
  const espnTeam = espnTeamIds[teamName];
  if (espnTeam) {
    const logoUrl = `https://a.espncdn.com/i/teamlogos/${espnTeam.league}/500/${espnTeam.id}.png`;
    logoCache.set(cacheKey, logoUrl);
    return logoUrl;
  }
  
  // Cache null result for unknowns
  logoCache.set(cacheKey, null);
  return null;
};

/**
 * Get country flag for cricket teams (international)
 * @param {string} teamName - Name of the team/country
 * @returns {Promise<string|null>} - Promise resolving to URL of country flag
 */
export const getCricketFlag = async (teamName) => {
  if (!teamName) return null;
  
  // Special case: West Indies - use cricket badge
  if (teamName.includes('West Indies')) {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Cricket_West_Indies_Logo_2017.svg/100px-Cricket_West_Indies_Logo_2017.svg.png';
  }
  
  // Country code mapping for cricket teams
  const countryCodeMap = {
    'India': 'in',
    'Pakistan': 'pk',
    'Australia': 'au',
    'New Zealand': 'nz',
    'South Africa': 'za',
    'England': 'gb-eng',
    'Sri Lanka': 'lk',
    'Bangladesh': 'bd',
    'Afghanistan': 'af',
    'Zimbabwe': 'zw',
    'Ireland': 'ie',
    'Scotland': 'gb-sct',
    'Netherlands': 'nl',
    'USA': 'us',
    'United States': 'us',
    'UAE': 'ae',
    'Oman': 'om',
    'Nepal': 'np',
    'Kenya': 'ke'
  };
  
  // Try exact match first
  if (countryCodeMap[teamName]) {
    return `https://flagcdn.com/w40/${countryCodeMap[teamName]}.png`;
  }
  
  // Try partial match (for "India Women", "Australia Men" etc)
  for (const [country, code] of Object.entries(countryCodeMap)) {
    if (teamName.includes(country)) {
      return `https://flagcdn.com/w40/${code}.png`;
    }
  }
  
  return null;
};

/**
 * Get team short code for display
 * @param {string} teamName - Full team name
 * @returns {string} - Short code (3 letters)
 */
export const getTeamShortCode = (teamName) => {
  const shortCodes = {
    // Premier League
    'Arsenal': 'ARS',
    'Aston Villa': 'AVL',
    'Bournemouth': 'BOU',
    'Brentford': 'BRE',
    'Brighton and Hove Albion': 'BHA',
    'Brighton': 'BHA',
    'Burnley': 'BUR',
    'Chelsea': 'CHE',
    'Crystal Palace': 'CRY',
    'Everton': 'EVE',
    'Fulham': 'FUL',
    'Ipswich Town': 'IPS',
    'Leeds United': 'LEE',
    'Leicester City': 'LEI',
    'Liverpool': 'LIV',
    'Luton Town': 'LUT',
    'Manchester City': 'MCI',
    'Manchester United': 'MUN',
    'Newcastle United': 'NEW',
    'Nottingham Forest': 'NFO',
    'Sheffield United': 'SHU',
    'Southampton': 'SOU',
    'Tottenham Hotspur': 'TOT',
    'Tottenham': 'TOT',
    'West Ham United': 'WHU',
    'West Ham': 'WHU',
    'Wolverhampton Wanderers': 'WOL',
    'Wolves': 'WOL',
    
    // La Liga
    'Athletic Bilbao': 'ATH',
    'Athletic Club': 'ATH',
    'Atletico Madrid': 'ATM',
    'Atlético Madrid': 'ATM',
    'Barcelona': 'BAR',
    'Celta Vigo': 'CEL',
    'Getafe': 'GET',
    'Girona': 'GIR',
    'Las Palmas': 'LPA',
    'Osasuna': 'OSA',
    'Rayo Vallecano': 'RAY',
    'Real Betis': 'BET',
    'Real Madrid': 'RMA',
    'Real Sociedad': 'RSO',
    'Sevilla': 'SEV',
    'Valencia': 'VAL',
    'Villarreal': 'VIL',
    
    // Serie A
    'AC Milan': 'MIL',
    'Atalanta': 'ATA',
    'Bologna': 'BOL',
    'Cagliari': 'CAG',
    'Como': 'COM',
    'Empoli': 'EMP',
    'Fiorentina': 'FIO',
    'Frosinone': 'FRO',
    'Genoa': 'GEN',
    'Inter Milan': 'INT',
    'Internazionale': 'INT',
    'Juventus': 'JUV',
    'Lazio': 'LAZ',
    'Lecce': 'LEC',
    'Monza': 'MON',
    'Napoli': 'NAP',
    'Parma': 'PAR',
    'AS Roma': 'ROM',
    'Roma': 'ROM',
    'Salernitana': 'SAL',
    'Sassuolo': 'SAS',
    'Torino': 'TOR',
    'Udinese': 'UDI',
    'Verona': 'VER',
    'Hellas Verona': 'VER',
    
    // Bundesliga
    'Augsburg': 'AUG',
    'Bayern Munich': 'BAY',
    'Bayer Leverkusen': 'LEV',
    'Borussia Dortmund': 'DOR',
    'Borussia Monchengladbach': 'BMG',
    'Darmstadt': 'DAR',
    'Eintracht Frankfurt': 'FRA',
    'Freiburg': 'FRE',
    'Heidenheim': 'HEI',
    'Hoffenheim': 'HOF',
    'Mainz': 'MAI',
    'RB Leipzig': 'RBL',
    'Union Berlin': 'UNI',
    'VfB Stuttgart': 'STU',
    'Werder Bremen': 'BRE',
    'Wolfsburg': 'WOL',
    
    // Ligue 1
    'Brest': 'BRE',
    'Lens': 'LEN',
    'Lille': 'LIL',
    'Lyon': 'LYO',
    'Marseille': 'MAR',
    'Monaco': 'MON',
    'Montpellier': 'MTP',
    'Nantes': 'NAN',
    'Nice': 'NIC',
    'Paris Saint Germain': 'PSG',
    'PSG': 'PSG',
    'Reims': 'REI',
    'Rennes': 'REN',
    'Strasbourg': 'STR',
    'Toulouse': 'TOU',
    
    // MLS
    'Atlanta United': 'ATL',
    'Austin FC': 'AUS',
    'Charlotte FC': 'CHA',
    'Chicago Fire': 'CHI',
    'FC Cincinnati': 'CIN',
    'Colorado Rapids': 'COL',
    'Columbus Crew': 'CLB',
    'DC United': 'DCU',
    'FC Dallas': 'DAL',
    'Houston Dynamo': 'HOU',
    'Inter Miami': 'MIA',
    'Los Angeles FC': 'LAF',
    'LAFC': 'LAF',
    'LA Galaxy': 'LAG',
    'Minnesota United': 'MIN',
    'CF Montreal': 'MTL',
    'Nashville SC': 'NSH',
    'New England Revolution': 'NER',
    'New York City FC': 'NYC',
    'New York Red Bulls': 'NYR',
    'Orlando City': 'ORL',
    'Philadelphia Union': 'PHI',
    'Portland Timbers': 'POR',
    'Real Salt Lake': 'RSL',
    'San Jose Earthquakes': 'SJE',
    'Seattle Sounders': 'SEA',
    'Sporting Kansas City': 'SKC',
    'St. Louis City': 'STL',
    'Toronto FC': 'TOR',
    'Vancouver Whitecaps': 'VAN',
    
    // Liga MX
    'América': 'AME',
    'Club América': 'AME',
    'Atlas': 'ATL',
    'Atlético San Luis': 'ASL',
    'Cruz Azul': 'CRU',
    'FC Juárez': 'JUA',
    'Guadalajara': 'GDL',
    'Chivas': 'GDL',
    'León': 'LEO',
    'Mazatlán': 'MAZ',
    'Monterrey': 'MTY',
    'Necaxa': 'NEC',
    'Pachuca': 'PAC',
    'Puebla': 'PUE',
    'Querétaro': 'QUE',
    'Santos Laguna': 'SAN',
    'Tijuana': 'TIJ',
    'Toluca': 'TOL',
    'UNAM': 'PUM',
    'Pumas UNAM': 'PUM',
    
    // Brazilian Serie A
    'Flamengo': 'FLA',
    'Palmeiras': 'PAL',
    'Corinthians': 'COR',
    'São Paulo': 'SAO',
    'Sao Paulo': 'SAO',
    'Fluminense': 'FLU',
    'Atlético Mineiro': 'CAM',
    'Atletico Mineiro': 'CAM',
    'Grêmio': 'GRE',
    'Gremio': 'GRE',
    'Internacional': 'INT',
    'Botafogo': 'BOT',
    'Santos': 'SAN',
    'Vasco da Gama': 'VAS',
    'Cruzeiro': 'CRU',
    'Bahia': 'BAH',
    'Athletico Paranaense': 'CAP',
    'Fortaleza': 'FOR',
    'Red Bull Bragantino': 'RBB',
    'Atlético Goianiense': 'ACG',
    'Atletico Goianiense': 'ACG',
    
    // Argentine Primera División
    'Boca Juniors': 'BOC',
    'River Plate': 'RIV',
    'Racing Club': 'RAC',
    'Independiente': 'IND',
    'San Lorenzo': 'SLO',
    'Estudiantes': 'EST',
    'Vélez Sarsfield': 'VEL',
    'Velez Sarsfield': 'VEL',
    'Newells Old Boys': 'NOB',
    'Rosario Central': 'ROS',
    'Talleres': 'TAL',
    'Lanús': 'LAN',
    'Lanus': 'LAN',
    'Argentinos Juniors': 'ARG',
    'Defensa y Justicia': 'DYJ',
    
    // Chilean Primera División
    'Colo-Colo': 'COL',
    'Universidad de Chile': 'UCH',
    'Universidad Católica': 'UCA',
    'Universidad Catolica': 'UCA',
    
    // Colombian Categoría Primera A
    'Atlético Nacional': 'NAC',
    'Atletico Nacional': 'NAC',
    'Millonarios': 'MIL',
    'América de Cali': 'AME',
    'America de Cali': 'AME',
    'Independiente Medellín': 'MED',
    'Independiente Medellin': 'MED',
    'Junior': 'JUN',
    'Deportivo Cali': 'CAL',
    'Santa Fe': 'SFE',
    
    // Uruguayan Primera División
    'Peñarol': 'PEN',
    'Penarol': 'PEN',
    'Nacional': 'NAC',
    
    // Ecuadorian Serie A
    'Barcelona SC': 'BSC',
    'Emelec': 'EME',
    'LDU Quito': 'LDU',
    'Independiente del Valle': 'IDV',
    
    // Asian & African Teams
    'Al-Hilal': 'HIL',
    'Al Hilal': 'HIL',
    'Al-Nassr': 'NAS',
    'Al Nassr': 'NAS',
    'Al-Ittihad': 'ITT',
    'Al Ittihad': 'ITT',
    'Al-Ahli': 'AHL',
    'Al Ahli': 'AHL',
    'Al Ahly': 'AHL',
    'Zamalek': 'ZAM',
    'Mamelodi Sundowns': 'SUN',
    'Kaizer Chiefs': 'KAI',
    'Orlando Pirates': 'ORL',
    
    // National Teams (3-letter FIFA codes)
    'England': 'ENG',
    'France': 'FRA',
    'Germany': 'GER',
    'Spain': 'ESP',
    'Italy': 'ITA',
    'Portugal': 'POR',
    'Netherlands': 'NED',
    'Belgium': 'BEL',
    'Croatia': 'CRO',
    'Brazil': 'BRA',
    'Argentina': 'ARG',
    'Uruguay': 'URU',
    'Colombia': 'COL',
    'Mexico': 'MEX',
    'United States': 'USA',
    'USA': 'USA',
    'Canada': 'CAN',
    'Japan': 'JPN',
    'South Korea': 'KOR',
    'Australia': 'AUS',
    'Saudi Arabia': 'KSA',
    'Iran': 'IRN',
    'Morocco': 'MAR',
    'Senegal': 'SEN',
    'Nigeria': 'NGA',
    'Egypt': 'EGY',
    'Tunisia': 'TUN',
    'Algeria': 'ALG',
    'Ghana': 'GHA',
    'Cameroon': 'CMR',
    'Switzerland': 'SUI',
    'Denmark': 'DEN',
    'Sweden': 'SWE',
    'Poland': 'POL',
    'Wales': 'WAL',
    'Scotland': 'SCO',
    'Ireland': 'IRL',
    'Republic of Ireland': 'IRL',
    'Ecuador': 'ECU',
    'Peru': 'PER',
    'Chile': 'CHI',
    'Paraguay': 'PAR',
    'Costa Rica': 'CRC',
    'Qatar': 'QAT',
    'South Africa': 'RSA',
    'New Zealand': 'NZL'
  };
  
  return shortCodes[teamName] || teamName.substring(0, 3).toUpperCase();
};

/**
 * Get fallback icon based on sport
 * @param {string} sport - Sport type
 * @returns {string} - Emoji or icon for the sport
 */
export const getSportIcon = (sport) => {
  const sportIcons = {
    'soccer': '⚽',
    'football': '⚽',
    'basketball': '🏀',
    'cricket': '🏏',
    'hockey': '🏒',
    'baseball': '⚾',
    'tennis': '🎾',
    'rugby': '🏉',
    'golf': '⛳',
    'boxing': '🥊',
    'mma': '🥋'
  };
  
  return sportIcons[sport.toLowerCase()] || '🏆';
};

/**
 * Preload logos for a list of teams
 * @param {Array} teams - Array of team names
 * @param {string} sport - Sport type
 */
export const preloadTeamLogos = async (teams, sport = 'Soccer') => {
  const promises = teams.map(teamName => getTeamLogo(teamName, sport));
  await Promise.allSettled(promises);
};

export default {
  getTeamLogo,
  getCricketFlag,
  getSportIcon,
  getTeamShortCode,
  preloadTeamLogos
};
