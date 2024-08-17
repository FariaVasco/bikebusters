import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

const BikeList = ({ isAdmin, preferredManufacturers }) => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchBikes = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const response = await api.get('/bikes', { params: { search } });
      const allBikes = response.data;
      if (isAdmin) {
        setBikes(allBikes);
      } else {
        const filteredBikes = allBikes.filter(bike => 
          preferredManufacturers.includes(bike.make)
        );
        setBikes(filteredBikes);
      }
    } catch (err) {
      console.error('Error fetching bikes:', err);
      setError('Failed to fetch bikes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, preferredManufacturers]);

  useEffect(() => {
    fetchBikes();
  }, [fetchBikes]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      try {
        const response = await api.get('/bikes', { params: { search: searchTerm } });
        const searchResults = response.data;

        // Check for exact match
        const exactMatch = searchResults.find(bike => 
          bike.serialNumber.toLowerCase() === searchTerm.toLowerCase() ||
          bike.memberEmail?.toLowerCase() === searchTerm.toLowerCase()
        );

        if (exactMatch) {
          navigate(`/bike/${exactMatch._id}`);
        } else {

          // Update the bike list with search results
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

  if (loading) return <p>Loading bikes...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Bikes Under Investigation</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by serial number or email"
        />
        <button type="submit">Search</button>
      </form>
      {isAdmin ? (
        <p>Showing all bikes under investigation (Admin view)</p>
      ) : (
        <p>Showing bikes under investigation from preferred manufacturers: {preferredManufacturers.join(', ')}</p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BikeList;