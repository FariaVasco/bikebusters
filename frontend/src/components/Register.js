import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { cn } from "../lib/utils";
import api from '../services/api';

const Register = ({ onRegister, onGoBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false,
    preferredManufacturers: []
  });
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    setIsSubmitting(true);
    setError('');
    try {
      const response = await api.post('/auth/register', formData);
      console.log('Registration response:', response.data);
      onRegister(response.data);
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.msg || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4 py-12"
    >
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={onGoBack}
            variant="ghost"
            className="text-blue-500 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2" size={20} />
            Go Back
          </Button>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-center"
          >
            <UserPlus className="inline-block text-blue-500 mb-2" size={48} />
            <h2 className="text-3xl font-bold text-gray-800">Register</h2>
          </motion.div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAdmin"
              name="isAdmin"
              checked={formData.isAdmin}
              onCheckedChange={(checked) => handleChange({ target: { name: 'isAdmin', checked } })}
            />
            <Label htmlFor="isAdmin">Register as Admin</Label>
          </div>
          
          {!formData.isAdmin && (
            <div>
              <Label>Preferred Manufacturers</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {manufacturers.map(manufacturer => (
                  <div key={manufacturer._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`manufacturer-${manufacturer._id}`}
                      name="preferredManufacturers"
                      value={manufacturer._id}
                      checked={formData.preferredManufacturers.includes(manufacturer._id)}
                      onCheckedChange={(checked) => handleChange({ target: { name: 'preferredManufacturers', value: manufacturer._id, checked } })}
                    />
                    <Label htmlFor={`manufacturer-${manufacturer._id}`}>{manufacturer.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm mt-2"
            >
              <AlertTriangle className="inline mr-2" size={16} />
              {error}
            </motion.p>
          )}
          
          <Button 
            type="submit" 
            className={cn(
              "w-full py-3 bg-blue-500 hover:bg-blue-600 transition-colors duration-200",
              "flex items-center justify-center"
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default Register;