import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OddsTable from '../components/OddsTable';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminStats = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        await axios.post(`${API_URL}/api/admin/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      navigate('/admin/login');
    }
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Admin <span className="text-[#FFD700]">Statistics</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Detailed view with all FunBet.ME row configurations
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
          >
            Logout
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/30 rounded-lg p-6">
            <div className="text-[#FFD700] text-2xl mb-2">⭐</div>
            <h3 className="text-white font-bold mb-1">Super Boost</h3>
            <p className="text-gray-400 text-sm">5% better than market best (shown to all users)</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-lg p-6">
            <div className="text-blue-400 text-2xl mb-2">🚀</div>
            <h3 className="text-white font-bold mb-1">Boost</h3>
            <p className="text-gray-400 text-sm">+5% on Favourites & Underdog (admin only)</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-lg p-6">
            <div className="text-green-400 text-2xl mb-2">📊</div>
            <h3 className="text-white font-bold mb-1">Standard</h3>
            <p className="text-gray-400 text-sm">Digitain or average odds (admin only)</p>
          </div>
        </div>

        {/* Football Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">
            ⚽ Football Odds Comparison
          </h2>
          <OddsTable 
            sportKeys={['soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga']} 
            sportTitle="Football"
            usePriorityEndpoint={true}
            showAllRows={true}
          />
        </div>

        {/* Cricket Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">
            🏏 Cricket Odds Comparison
          </h2>
          <OddsTable 
            sportKeys={['cricket_ipl', 'cricket_test_match']} 
            sportTitle="Cricket"
            usePriorityEndpoint={true}
            showAllRows={true}
          />
        </div>

        {/* Note */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-500 text-sm">
            <strong>Note:</strong> Regular users only see "FunBet.ME Super Boost" row. Boost and Standard rows are visible only in this admin panel for comparison and analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
