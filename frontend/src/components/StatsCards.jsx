import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, Users, TrendingUp } from 'lucide-react';

const StatsCards = () => {
  const [stats, setStats] = useState({
    total_checks: 0,
    unique_clients: 0,
    clients: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsData = [
    {
      title: 'Total Checks',
      value: stats.total_checks,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Unique Clients',
      value: stats.unique_clients,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Growth Rate',
      value: '+12%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-testid="stats-cards">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-md hover:shadow-lg transition-shadow" data-testid={`stat-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-value-${index}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {index === 2 ? 'vs. last month' : 'Active in system'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default React.memo(StatsCards);
