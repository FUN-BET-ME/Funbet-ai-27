import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import FootballOdds from "./pages/FootballOdds";
import CricketOdds from "./pages/CricketOdds";
import NFLOdds from "./pages/NFLOdds";
import GolfOdds from "./pages/GolfOdds";
import OtherSportsOdds from "./pages/OtherSportsOdds";
import LiveOdds from "./pages/LiveOdds";
import MatchDetail from "./pages/MatchDetail";
import FunBetIQ from "./pages/FunBetIQ";
import PredictionHistory from "./pages/PredictionHistory";
import Stats from "./pages/Stats";
import ResponsiblePlay from "./pages/ResponsiblePlay";
import About from "./pages/About";
import AdminStats from "./pages/AdminStats";
import AdminIQ from "./pages/AdminIQ";
import AdminLogin from "./pages/AdminLogin";
import MatchPrediction from "./pages/MatchPrediction";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";

function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <div className="App">
          <BrowserRouter>
            <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/football-odds" element={<FootballOdds />} />
            <Route path="/cricket-odds" element={<CricketOdds />} />
            <Route path="/nfl-odds" element={<NFLOdds />} />
            <Route path="/golf-odds" element={<GolfOdds />} />
            <Route path="/other-sports-odds" element={<OtherSportsOdds />} />
            <Route path="/live-odds" element={<LiveOdds />} />
            <Route path="/odds" element={<LiveOdds />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
            <Route path="/prediction/:matchId" element={<MatchPrediction />} />
            <Route path="/funbet-iq" element={<FunBetIQ />} />
            <Route path="/predictions" element={<FunBetIQ />} /> {/* Keep old route for backward compatibility */}
            <Route path="/prediction-history" element={<PredictionHistory />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/responsible-play" element={<ResponsiblePlay />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="/admin/iq" element={<AdminIQ />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
      </FavoritesProvider>
    </ThemeProvider>
  );
}

export default App;
