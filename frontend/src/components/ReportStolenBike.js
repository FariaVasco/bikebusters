import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bike, AlertTriangle, Check, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { cn } from "../lib/utils";
import api from '../services/api';

const ReportStolenBike = ({ onGoBack }) => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    if (formData.trackerId && !validateTrackerId(formData.trackerId)) {
      setError('Tracker ID must be 8 characters long and contain only numbers or letters a-f');
      setIsSubmitting(false);
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
            <Bike className="inline-block text-blue-500 mb-2" size={48} />
            <h2 className="text-3xl font-bold text-gray-800">Report a Stolen Bike</h2>
          </motion.div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Select
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
            </Select>
          </div>
          
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="serialNumber">Serial Number</Label>
            <Input
              type="text"
              id="serialNumber"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="trackerId">Tracker ID (optional)</Label>
            <Input
              type="text"
              id="trackerId"
              name="trackerId"
              value={formData.trackerId}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Label htmlFor="lastSeenDate">Last Seen Date</Label>
            <Input
              type="datetime-local"
              id="lastSeenDate"
              name="lastSeenDate"
              value={formData.lastSeenDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="realizedMissingDate">Realized Missing Date</Label>
            <Input
              type="datetime-local"
              id="realizedMissingDate"
              name="realizedMissingDate"
              value={formData.realizedMissingDate}
              onChange={handleChange}
              required
            />
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
          
          {success && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-500 text-sm mt-2"
            >
              <Check className="inline mr-2" size={16} />
              {success}
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
            {isSubmitting ? 'Reporting...' : 'Report Stolen Bike'}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

export default ReportStolenBike;