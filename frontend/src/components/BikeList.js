import React, { useState, useEffect, useCallback, Navigate } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useAuth } from '../contexts/AuthContext';

const BikeList = () => {
  const { isAuthenticated, isAdmin, user, preferredManufacturers } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [availableManufacturers, setAvailableManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('all');
  const [lastSignalFilter, setLastSignalFilter] = useState('all');
  const navigate = useNavigate();

  const fetchBikes = useCallback(async (search = '') => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/bikes', { 
        params: { 
          search,
          manufacturer: selectedManufacturer === 'all' ? '' : selectedManufacturer,
          lastSignal: lastSignalFilter === 'all' ? '' : lastSignalFilter
        } 
      });
      const { bikes: fetchedBikes, manufacturers: fetchedManufacturers } = response.data;
      setBikes(fetchedBikes);
      setAvailableManufacturers(fetchedManufacturers);
    } catch (err) {
      console.error('Error fetching bikes:', err);
      setError('Failed to fetch bikes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedManufacturer, lastSignalFilter, isAuthenticated, navigate]);

  useEffect(() => {
    fetchBikes();
  }, [fetchBikes]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      try {
        const response = await api.get('/bikes', { 
          params: { 
            search: searchTerm,
            manufacturer: selectedManufacturer === 'all' ? '' : selectedManufacturer,
            lastSignal: lastSignalFilter === 'all' ? '' : lastSignalFilter
          } 
        });
        const { bikes: searchResults } = response.data;

        const exactMatch = searchResults.find(bike => 
          bike.serialNumber.toLowerCase() === searchTerm.toLowerCase() ||
          bike.memberEmail?.toLowerCase() === searchTerm.toLowerCase()
        );

        if (exactMatch) {
          navigate(`/bike/${exactMatch._id}`);
        } else {
          setBikes(searchResults);
        }
      } catch (err) {
        console.error('Error searching bikes:', err);
        setError('Failed to search bikes. Please try again.');
      }
    } else {
      fetchBikes();
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (loading) return <p className="text-center mt-8">Loading bikes...</p>;
  if (error) return <p className="text-red-500 text-center mt-8">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bikes Under Investigation</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by serial number or email"
                className="flex-grow"
              />
              <Button type="submit">Search</Button>
            </div>
            <div className="flex space-x-2">
            <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
              <SelectTrigger className="flex-grow">
                <SelectValue placeholder="All Manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {availableManufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lastSignalFilter} onValueChange={setLastSignalFilter}>
              <SelectTrigger className="flex-grow">
                <SelectValue placeholder="All Last Signal Times" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Last Signal Times</SelectItem>
                <SelectItem value="recent">Less than 1 hour ago</SelectItem>
                <SelectItem value="moderate">1 to 24 hours ago</SelectItem>
                <SelectItem value="old">More than 24 hours ago</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin
              ? "All Bikes Under Investigation (Admin View)"
              : "Bikes Under Investigation from Your Preferred Manufacturers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bikes.length === 0 ? (
            <p className="text-center text-gray-500">No bikes currently under investigation.</p>
          ) : (
            <ul className="space-y-2">
              {bikes.map(bike => (
                <li key={bike._id} className="border-b pb-2">
                  <Link to={`/bike/${bike._id}`} className="text-blue-500 hover:underline">
                    {bike.make} {bike.model} - SN: {bike.serialNumber}
                  </Link>
                  <span className="text-sm text-gray-500 ml-2">
                    Last Signal: {new Date(bike.lastSignal).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BikeList;