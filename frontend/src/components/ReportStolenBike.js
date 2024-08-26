import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bike, AlertTriangle, Check, ArrowLeft, MapPin, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Textarea } from '../components/ui/textarea';
import { cn } from "../lib/utils";
import api from '../services/api';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

const libraries = ["places"];

const ReportStolenBike = ({ onGoBack }) => {
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    serialNumber: '',
    trackerId: '',
    lastSeenDate: '',
    realizedMissingDate: '',
    email: '',
    address: '',
    latitude: null,
    longitude: null,
    unlockCode: '',
    isKeyChain: false,
    reason: '',
    otherReason: '',
    policeReportFile: null,
    updateMechanism: null
  });
  const [manufacturers, setManufacturers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 52.3676, lng: 4.9041 }); // Amsterdam center
  const addressInputRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const mapRef = useRef();
  const autocompleteRef = useRef();
  const fileInputRef = useRef();

  const handlePlaceSelect = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address,
          latitude: lat,
          longitude: lng
        }));
        setMapCenter({ lat, lng });
      }
    }
  }, []);

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setFormData(prevData => ({
      ...prevData,
      latitude: lat,
      longitude: lng
    }));
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK") {
        if (results[0]) {
          setFormData(prev => ({
            ...prev,
            address: results[0].formatted_address,
            latitude: lat,
            longitude: lng
          }));
        }
      }
    });
  };

  useEffect(() => {
    if (isLoaded && addressInputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address']
      });
      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }
  }, [isLoaded, handlePlaceSelect]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };


  const handleUpdateMechanismChange = (value) => {
    setFormData(prev => ({ ...prev, updateMechanism: value }));
  };

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await api.get('/manufacturers');
        console.log('Manufacturers response:', response.data);
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
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prevData => ({
      ...prevData,
      policeReportFile: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const requiredFields = [
      'manufacturer', 'model', 'serialNumber', 'email', 'lastSeenDate',
      'realizedMissingDate', 'address', 'latitude', 'longitude', 'reason', 'updateMechanism'
    ];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      setError(`Please fill out the following required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    if (formData.reason === 'Other' && !formData.otherReason) {
      setError('Please provide a reason when selecting "Other"');
      setIsSubmitting(false);
      return;
    }

    if (formData.trackerId && !validateTrackerId(formData.trackerId)) {
      setError('Tracker ID must be 8 characters long and contain only numbers or letters a-f');
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'policeReportFile') {
          formDataToSend.append(key, formData[key]);
        }
      });
      if (formData.policeReportFile) {
        formDataToSend.append('policeReportFile', formData.policeReportFile);
      }

      const response = await api.post('/bikes/report', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`Bike reported as stolen successfully. Bike ID: ${response.data.bikeId}, Report ID: ${response.data.reportId}`);
      setFormData({
        manufacturer: '',
        model: '',
        serialNumber: '',
        trackerId: '',
        lastSeenDate: '',
        realizedMissingDate: '',
        email: '',
        address: '',
        latitude: null,
        longitude: null,
        unlockCode: '',
        isKeyChain: false,
        reason: '',
        otherReason: '',
        policeReportFile: null,
        updateMechanism: null
      });
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while reporting the bike');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateTrackerId = (trackerId) => {
    const regex = /^[a-f0-9]{8}$/;
    return trackerId === '' || regex.test(trackerId);
  };

  if (!isLoaded) return <div>Loading...</div>;

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
        {manufacturers.length === 0 && <p>No manufacturers available</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Select
            value={formData.manufacturer}
            onValueChange={(value) => setFormData(prev => ({ ...prev, manufacturer: value }))}
            disabled={manufacturers.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={manufacturers.length === 0 ? "Loading..." : "Select a manufacturer"} />
            </SelectTrigger>
            <SelectContent>
              {manufacturers.map((manufacturer) => (
                <SelectItem key={manufacturer._id} value={manufacturer.name}>
                  {manufacturer.name}
                </SelectItem>
              ))}
            </SelectContent>
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
            <Label htmlFor="unlockCode">Unlock Code (3 digits)</Label>
            <Input
              type="text"
              id="unlockCode"
              name="unlockCode"
              value={formData.unlockCode}
              onChange={handleChange}
              maxLength="3"
              pattern="\d{3}"
              disabled={formData.isKeyChain}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isKeyChain"
              name="isKeyChain"
              checked={formData.isKeyChain}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isKeyChain: checked, unlockCode: checked ? '' : prev.unlockCode }))}
            />
            <Label htmlFor="isKeyChain">Key Chain (no unlock code)</Label>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Report</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Debt">Debt</SelectItem>
                <SelectItem value="Stolen">Stolen</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.reason === 'Other' && (
            <div>
              <Label htmlFor="otherReason">Specify Other Reason</Label>
              <Textarea
                id="otherReason"
                name="otherReason"
                value={formData.otherReason}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="space-y-2">
          <Label>Update Mechanism</Label>
          <RadioGroup
            value={formData.updateMechanism}
            onValueChange={handleUpdateMechanismChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="polling" id="polling" />
              <Label htmlFor="polling">Polling</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="update" id="update" />
              <Label htmlFor="update">Update</Label>
            </div>
          </RadioGroup>
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
          
          <div>
          <Label htmlFor="address">Last Seen Location</Label>
          <Input
            type="text"
            id="address"
            name="address"
            ref={addressInputRef}
            value={formData.address}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="h-64 w-full mt-4">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={10}
            onClick={handleMapClick}
          >
            {formData.latitude && formData.longitude && (
              <Marker
                position={{ lat: formData.latitude, lng: formData.longitude }}
              />
            )}
          </GoogleMap>
        </div>

          <div>
            <Label htmlFor="policeReportFile">Police Report (PDF, optional)</Label>
            <Input
              type="file"
              id="policeReportFile"
              name="policeReportFile"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="w-full flex items-center justify-center"
            >
              <Upload className="mr-2" size={20} />
              Upload Police Report
            </Button>
            {formData.policeReportFile && (
              <p className="mt-2 text-sm text-gray-600">
                File selected: {formData.policeReportFile.name}
              </p>
            )}
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