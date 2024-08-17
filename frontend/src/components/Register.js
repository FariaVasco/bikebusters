import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false,
    preferredManufacturers: []
  });
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');

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
    const { name, value, type, checked } = e.target;
    
    if (name === 'isAdmin') {
      setFormData(prevData => ({
        ...prevData,
        isAdmin: checked,
        preferredManufacturers: checked ? [] : prevData.preferredManufacturers
      }));
    } else if (name === 'preferredManufacturers') {
      setFormData(prevData => {
        if (checked) {
          return {
            ...prevData,
            preferredManufacturers: [...prevData.preferredManufacturers, value]
          };
        } else {
          return {
            ...prevData,
            preferredManufacturers: prevData.preferredManufacturers.filter(id => id !== value)
          };
        }
      });
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form data being submitted:', formData);
    try {
      const response = await api.post('/auth/register', formData);
      console.log('Registration response:', response.data);
      onRegister(response.data);
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.msg || 'Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="isAdmin">
          <input
            type="checkbox"
            id="isAdmin"
            name="isAdmin"
            checked={formData.isAdmin}
            onChange={handleChange}
          />
          Register as Admin
        </label>
      </div>
      {!formData.isAdmin && (
        <div>
          <p>Preferred Manufacturers:</p>
          {manufacturers.map(manufacturer => (
            <div key={manufacturer._id}>
              <label>
                <input
                  type="checkbox"
                  name="preferredManufacturers"
                  value={manufacturer._id}
                  checked={formData.preferredManufacturers.includes(manufacturer._id)}
                  onChange={handleChange}
                />
                {manufacturer.name}
              </label>
            </div>
          ))}
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;