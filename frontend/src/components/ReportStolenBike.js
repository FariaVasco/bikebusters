import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReportStolenBike = () => {
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    serialNumber: '',
    trackerId: '',
    lastSeenDate: '',
    realizedMissingDate: ''
  });
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await api.get('/manufacturers');
        setManufacturers(response.data);
      } catch (err) {
        console.error('Error fetching manufacturers:', err);
        setError('Failed to load manufacturers. Please try again.');
      }
    };
    fetchManufacturers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateTrackerId = (trackerId) => {
    const regex = /^[a-f0-9]{8}$/;
    return trackerId === '' || regex.test(trackerId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.trackerId && !validateTrackerId(formData.trackerId)) {
      setError('Tracker ID must be 8 characters long and contain only numbers or letters a-f');
      return;
    }

  try {
    const response = await api.post('/bikes/report', formData);
    setSuccess(`Bike reported as stolen successfully. Bike ID: ${response.data.bikeId}, Report ID: ${response.data.reportId}`);
    setFormData({
        manufacturer: '',
        model: '',
        serialNumber: '',
        trackerId: '',
        lastSeenDate: '',
        realizedMissingDate: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while reporting the bike');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Report a Stolen Bike</h2>
      <div>
        <label htmlFor="manufacturer">Manufacturer:</label>
        <select
          id="manufacturer"
          name="manufacturer"
          value={formData.manufacturer}
          onChange={handleChange}
          required
          >
          <option value="">Select a manufacturer</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer._id} value={manufacturer.name}>
              {manufacturer.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="model">Model:</label>
        <input
          type="text"
          id="model"
          name="model"
          value={formData.model}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="serialNumber">Serial Number:</label>
        <input
          type="text"
          id="serialNumber"
          name="serialNumber"
          value={formData.serialNumber}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="trackerId">Tracker ID (optional):</label>
        <input
          type="text"
          id="trackerId"
          name="trackerId"
          value={formData.trackerId}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="lastSeenDate">Last Seen Date:</label>
        <input
          type="datetime-local"
          id="lastSeenDate"
          name="lastSeenDate"
          value={formData.lastSeenDate}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="realizedMissingDate">Realized Missing Date:</label>
        <input
          type="datetime-local"
          id="realizedMissingDate"
          name="realizedMissingDate"
          value={formData.realizedMissingDate}
          onChange={handleChange}
          required
        />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <button type="submit">Report Stolen Bike</button>
    </form>
  );
};

export default ReportStolenBike;