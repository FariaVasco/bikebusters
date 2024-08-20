import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

const BikeList = ({isAdmin, preferredManufacturers }) => {
  const [bikes, setBikes] = useState([]);
  const [availableManufacturers, setAvailableManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [lastSignalFilter, setLastSignalFilter] = useState('');
  const navigate = useNavigate();

  const fetchBikes = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const response = await api.get('/bikes', { 
        params: { 
          search,
          manufacturer: selectedManufacturer,
          lastSignal: lastSignalFilter
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
  }, [selectedManufacturer, lastSignalFilter]);

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
            manufacturer: selectedManufacturer,
            lastSignal: lastSignalFilter
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

  const handleManufacturerChange = (e) => {
    setSelectedManufacturer(e.target.value);
  };

  const handleLastSignalChange = (e) => {
    setLastSignalFilter(e.target.value);
  };

  if (loading) return <p>Loading bikes...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Bikes Under Investigation</h2>
      <Link to="/dashboard" className="dashboard-link">View Statistics Dashboard</Link>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by serial number or email"
        />
        <select value={selectedManufacturer} onChange={handleManufacturerChange}>
          <option value="">All Manufacturers</option>
          {availableManufacturers.map(manufacturer => (
            <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
          ))}
        </select>
        <select value={lastSignalFilter} onChange={handleLastSignalChange}>
          <option value="">All Last Signal Times</option>
          <option value="recent">Less than 1 hour ago</option>
          <option value="moderate">1 to 24 hours ago</option>
          <option value="old">More than 24 hours ago</option>
        </select>
        <button type="submit">Search</button>
      </form>
      
      {isAdmin ? (
        <p>Showing all bikes under investigation (Admin view)</p>
      ) : (
        <p>Showing bikes under investigation from your preferred manufacturers</p>
      )}

      {bikes.length === 0 ? (
        <p>No bikes currently under investigation.</p>
      ) : (
        <ul>
          {bikes.map(bike => (
            <li key={bike._id}>
              <Link to={`/bike/${bike._id}`}>
                {bike.make} {bike.model} - SN: {bike.serialNumber}
              </Link>
              <span> - Last Signal: {new Date(bike.lastSignal).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BikeList;