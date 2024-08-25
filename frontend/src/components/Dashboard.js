import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        console.log('User not loaded yet');
        return;
      }

      try {
        setLoading(true);
        const response = await api.get('/dashboard', {
          params: {
            isAdmin: user.isAdmin,
            manufacturers: user.preferredManufacturers
          }
        });
        setDashboardData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (!user) return <div>Loading user data...</div>;
  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboardData) return null;

  // Destructure the data here, after we're sure it's loaded
  const {
    bikeStatusCounts,
    newBikesToday,
    retrievedByManufacturer,
    userRetrievedBikes,
    dailyTargetProgress,
    breakEvenProgress,
    totalBikes,
    totalRetrieved,
    retrievalTrend
  } = dashboardData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            <Card>
        <CardHeader>
          <CardTitle>Bike Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie 
                dataKey="value" 
                data={[
                  ...bikeStatusCounts,
                  { name: 'Lost', value: dashboardData.lostBikes || 0 }
                ]} 
                fill="#8884d8" 
                label 
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lost Bikes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center">{dashboardData.lostBikes || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Bikes Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center">{newBikesToday}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retrieved Bikes by Manufacturer</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={retrievedByManufacturer}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Retrieved Bikes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div>
              <p>Today: {userRetrievedBikes.daily}</p>
              <p>This Month: {userRetrievedBikes.monthly}</p>
              <p>This Year: {userRetrievedBikes.yearly}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Target Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={dailyTargetProgress} />
          <p className="text-center mt-2">{dailyTargetProgress}% of daily target reached</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Break Even Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={breakEvenProgress} />
          <p className="text-center mt-2">{breakEvenProgress}% of break even point reached</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Bikes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center">{totalBikes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Retrieved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center">{totalRetrieved}</div>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Retrieval Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retrievalTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="retrieved" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;