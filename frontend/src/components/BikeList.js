import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const BikeList = ({ isAdmin, preferredManufacturers }) => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/bikes');
        const allBikes = response.data;
        if (isAdmin) {
          setBikes(allBikes);
        } else {
          const filteredBikes = allBikes.filter(bike => 
            preferredManufacturers.includes(bike.make)
          );
          setBikes(filteredBikes);
        }      } catch (err) {
        console.error('Error fetching bikes:', err);
        setError('Failed to fetch bikes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBikes();
  }, [isAdmin, preferredManufacturers]);

  if (loading) return <p>Loading bikes...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Bike List</h2>
      {isAdmin ? (
        <p>Showing all bikes (Admin view)</p>
      ) : (
        <p>Showing bikes from preferred manufacturers: {preferredManufacturers.join(', ')}</p>
      )}

      {bikes.length === 0 ? (
        <p>No bikes found.</p>
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