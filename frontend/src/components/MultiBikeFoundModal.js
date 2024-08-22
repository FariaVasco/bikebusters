import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import api from '../services/api';
import { Textarea } from './ui/textarea';


const MultiBikeFoundModal = ({ isOpen, onClose, onSubmit, bikebustersLocations }) => {
  const [scannedBikes, setScannedBikes] = useState([]);
  const [currentSerialNumber, setCurrentSerialNumber] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');


  const handleAddBike = () => {
    if (currentSerialNumber && !scannedBikes.includes(currentSerialNumber)) {
      setScannedBikes([...scannedBikes, currentSerialNumber]);
      setCurrentSerialNumber('');
    }
  };

  const handleRemoveBike = (serialNumber) => {
    setScannedBikes(scannedBikes.filter(sn => sn !== serialNumber));
  };

  const handleSubmit = async () => {
    if (scannedBikes.length === 0 || !selectedLocation) {
      setError('Please add at least one bike and select a location.');
      return;
    }

    try {
    const response = await api.post('/bikes/mark-multiple-found', {
        serialNumbers: scannedBikes,
        bikebustersLocationId: selectedLocation,
        notes: notes
        });
      onSubmit(response.data);
      onClose();
    } catch (error) {
      setError('An error occurred while marking bikes as found.');
      console.error('Error marking multiple bikes as found:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <Card className="w-96">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Mark Multiple Bikes as Found</CardTitle>
          <Button variant="ghost" onClick={onClose}><X size={20} /></Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={currentSerialNumber}
                onChange={(e) => setCurrentSerialNumber(e.target.value)}
                placeholder="Enter serial number"
              />
              <Button onClick={handleAddBike}>Add</Button>
            </div>
            <ul className="space-y-2">
              {scannedBikes.map(serialNumber => (
                <li key={serialNumber} className="flex justify-between items-center">
                  <span>{serialNumber}</span>
                  <Button variant="ghost" onClick={() => handleRemoveBike(serialNumber)}><X size={16} /></Button>
                </li>
              ))}
            </ul>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {bikebustersLocations.map(location => (
                  <SelectItem key={location._id} value={location._id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the recovery"
            />
            {error && <p className="text-red-500">{error}</p>}
            <Button onClick={handleSubmit} disabled={scannedBikes.length === 0 || !selectedLocation}>
              Mark as Found
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MultiBikeFoundModal;