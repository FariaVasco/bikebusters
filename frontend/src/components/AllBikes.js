import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const AllBikesList = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const response = await api.get('/bikes');
        setBikes(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bikes:', err);
        setError('Failed to load bikes. Please try again.');
        setLoading(false);
      }
    };

    fetchBikes();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>All Bikes</h1>
      <ul>
        {bikes.map(bike => (
          <li key={bike._id}>
            <Link to={`/bike/${bike._id}`}>
              {bike.make} {bike.model} - Serial: {bike.serialNumber}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AllBikesList;