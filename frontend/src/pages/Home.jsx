import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { TrendingUp, BarChart3, Brain, Trophy, ArrowRight, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import axios from 'axios';

const Home = () => {
  const [latestNews, setLatestNews] = useState([]);
  const [showAllSports, setShowAllSports] = useState(false);

  useEffect(() => {
    // Fetch latest 3 news articles for homepage
    const fetchNews = async () => {
      try {
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
        const API = `${BACKEND_URL}/api`;
        
        const response = await axios.get(`${API}/news`, {
          params: {
            q: 'sports',
            pageSize: 3
          }
        });
        
        const articles = response.data.articles
          .filter(article => article.urlToImage && article.title)
          .slice(0, 3)
          .map(article => ({
            id: article.url,
            title: article.title,
            summary: article.description,
            date: article.publishedAt,
            image: article.urlToImage,
            url: article.url
          }));
        
        setLatestNews(articles);
      } catch (err) {
        console.error('Error fetching news:', err);
      }
    };

    fetchNews();
  }, []);
  const sports = [
    {
      name: 'Football',
      icon: '⚽',
      description: 'EPL, La Liga, Bundesliga, Serie A, Champions League & 20+ leagues',
      link: '/live-odds?filter=football',
      color: 'from-green-500/20 to-emerald-500/20'
    },
    {
      name: 'Cricket',
      icon: '🏏',
      description: 'IPL, World Cup, Test Matches, ODI, T20 & International Cricket',
      link: '/live-odds?filter=cricket',
      color: 'from-blue-500/20 to-cyan-500/20'
    }
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'Live Odds Comparison',
      description: 'Track real-time odds from 30+ bookmakers across football and cricket.',
      link: '/live-odds'
    },
    {
      icon: BarChart3,
      title: 'Trending Insights',
      description: 'Popular matches and real-time odds movements. Track betting patterns and market trends.',
      link: '/stats'
    },
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Data-driven insights using advanced algorithms analyzing historical trends and current form.',
      link: '/predictions'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-transparent dark:via-transparent dark:to-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E004F]/20 via-transparent to-transparent dark:opacity-100 opacity-0" />
        {/* Light mode gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-transparent to-purple-100/20 dark:opacity-0 opacity-100" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
              Compare Odds. Analyze Stats.{' '}
              <span className="text-[#FFD700] dark:text-[#FFD700] bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent dark:bg-none dark:text-[#FFD700]">Win Smarter.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              Real-time odds, scores & AI insights for the next 14 days. Informational only.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 font-semibold text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              >
                <Link to="/live-odds">View SPORTS Odds</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-gray-800 dark:border-[#FFD700] text-gray-800 dark:text-[#FFD700] hover:bg-gray-100 dark:hover:bg-[#FFD700]/10 font-semibold text-base px-8 py-6 shadow-md"
              >
                <a
                  href="https://t.me/funbetdotme"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Telegram
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Quick Access */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-transparent dark:to-[#2E004F]/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Browse by <span className="text-amber-600 dark:text-[#FFD700]">Sport</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Select your favorite sport to view odds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {(showAllSports ? sports : sports.slice(0, 6)).map((sport, index) => (
              <Link
                key={index}
                to={sport.link}
                className="group"
              >
                <div className={`relative p-6 rounded-xl bg-gradient-to-br ${sport.color} border border-gray-200 dark:border-[#2E004F]/30 hover:border-amber-400 dark:hover:border-[#FFD700]/50 transition-all hover:transform hover:scale-105 cursor-pointer h-full shadow-sm hover:shadow-md`}>
                  <div className="text-center">
                    <div className="text-5xl mb-4">{sport.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {sport.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {sport.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-[#FFD700] group-hover:gap-3 transition-all">
                      <span className="text-sm font-semibold">View Odds</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Show More/Less Button */}
          {sports.length > 6 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowAllSports(!showAllSports)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] rounded-lg transition-colors font-medium"
              >
                {showAllSports ? (
                  <>
                    <ChevronUp className="w-5 h-5" />
                    Show Less Sports
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5" />
                    Show {sports.length - 6} More Sports
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to Make{' '}
              <span className="text-[#FFD700]">Informed Decisions</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Comprehensive sports data and AI analysis at your fingertips
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="group"
                >
                  <div className="p-6 rounded-xl bg-white/5 border border-[#2E004F]/30 hover:border-[#FFD700]/50 transition-all hover:transform hover:scale-105 h-full">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-[#FFD700]" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </Link>
              );
            })}</div>
        </div>
      </section>

      {/* Latest News Section */}
      {latestNews.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-[#2E004F]/5 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                  Latest <span className="text-[#FFD700]">Sports News</span>
                </h2>
                <p className="text-gray-400">
                  Breaking headlines from around the sports world
                </p>
              </div>
              <Button
                asChild
                className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 font-semibold"
              >
                <Link to="/news">
                  View All News
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestNews.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg overflow-hidden hover:border-[#FFD700]/50 transition-all hover:transform hover:scale-105 h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';
                        }}
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold mb-2 text-white line-clamp-2 group-hover:text-[#FFD700] transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center rounded-2xl bg-gradient-to-br from-[#2E004F]/30 to-[#4a0080]/20 border border-[#2E004F]/30 p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of users making smarter decisions with data-driven insights
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 font-semibold"
              >
                <Link to="/predictions">View AI Predictions</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Link to="/live-odds">Compare Live Odds</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;