import React, { useState, useEffect } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/v1/statistics');
        setStats(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  const statusData = [
    { name: 'Investigating', value: stats.reportedStolen },
    { name: 'Resolved', value: stats.recovered },
    { name: 'Other', value: stats.totalBikes - stats.reportedStolen - stats.recovered }
  ];

  const signalData = [
    { name: 'Recent (<1h)', value: stats.recentSignal || 0 },
    { name: 'Moderate (1-24h)', value: stats.moderateSignal || 0 },
    { name: 'Old (>24h)', value: stats.oldSignal || 0 }
  ];

  return (
    <div className="dashboard">
      <h1>Bike Statistics Dashboard</h1>
      
      <div className="stat-cards">
        <div className="stat-card">
          <h3>Total Bikes</h3>
          <p>{stats.totalBikes}</p>
        </div>
        <div className="stat-card">
          <h3>Reported Stolen</h3>
          <p>{stats.reportedStolen}</p>
        </div>
        <div className="stat-card">
          <h3>Recovered</h3>
          <p>{stats.recovered}</p>
        </div>
        <div className="stat-card">
          <h3>Recovery Rate</h3>
          <p>{stats.recoveryRate.toFixed(2)}%</p>
        </div>
      </div>

      <div className="charts">
        <div className="chart">
          <h3>Bike Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={statusData} fill="#8884d8" label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>Signal Strength Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie dataKey="value" data={signalData} fill="#82ca9d" label />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>Top 5 Manufacturers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topManufacturers || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;