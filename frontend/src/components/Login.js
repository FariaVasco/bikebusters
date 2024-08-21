import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { cn } from "../lib/utils";
import api from '../services/api';

const Login = ({ onGoBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/login', formData);
      console.log('Login successful:', response.data);
      
      // Use the login function from AuthContext
      login(response.data);
      
      // You might want to handle navigation here or in the parent component
      // For example, if you're using react-router:
      // navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.msg || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4"
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
              <LogIn className="inline-block text-blue-500 mb-2" size={48} />
              <h2 className="text-3xl font-bold text-gray-800">Login</h2>
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
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </motion.div>
    </React.Fragment>
  );
};

export default Login;