import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer, useLoadScript } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Navigation, Bike, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import Notification from './Notification';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { prioritizeBikes, formatTimeDifference, formatDuration } from '../utils/bikePrioritization';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 64px)', // Adjust based on your header height
};

const defaultCenter = {
  lat: 52.3676,
  lng: 4.9041
}

const userLocationIcon = {
  path: "M-8-8 l16 0 0 16 -16 0z",
  fillColor: "#4285F4",
  fillOpacity: 1,
  strokeWeight: 2,
  strokeColor: "#FFFFFF",
  scale: 1,
};

const libraries = ["places", "geometry"];

function Map({ bikes, userLocation, isAdmin, preferredManufacturers = [], onBikeUpdate }) {
  const [map, setMap] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBike, setSelectedBike] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [updatedBike, setUpdatedBike] = useState(null);
  const [newLocation, setNewLocation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sortedBikes, setSortedBikes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedBike, setSuggestedBike] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    make: '',
    status: '',
    timeFrame: ''
  });
  const mapRef = useRef(null);
  const navigationInterval = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [navigatingBikeId, setNavigatingBikeId] = useState(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });
  const [mapCenter, setMapCenter] = useState(userLocation || defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);


  const handleGetDirections = useCallback((bike) => {
    console.log('Getting directions for bike:', bike);
    if (!userLocation || !bike.location || !Array.isArray(bike.location.coordinates) || bike.location.coordinates.length !== 2) {
      console.error("Invalid data for directions:", { userLocation, bikeLocation: bike.location });
      return;
    }

    if (!window.google) {
      console.error("Google Maps not loaded yet");
      return;
    }

    const destination = {
      lat: bike.location.coordinates[1],
      lng: bike.location.coordinates[0]
    };

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          setIsNavigating(true);
          setNavigatingBikeId(bike._id);
          setCurrentPosition(result.routes[0].legs[0].start_location);
          setCurrentStep(0);
          console.log('Set isNavigating to true for bike:', bike._id);
        } else {
          console.error(`Error fetching directions ${result}`);
        }
      }
    );
  }, [userLocation]);

  useEffect(() => {
    socketRef.current = io('http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socketRef.current.on('bikeLocationUpdated', ({ bike, newLocation }) => {
      console.log('Received bikeLocationUpdated event:', { bike, newLocation });
      
      if (onBikeUpdate) {
        onBikeUpdate(bike, newLocation);
      }

      if (isNavigating) {
        console.log('Setting up notification for bike update');
        setUpdatedBike(bike);
        setNewLocation(newLocation);
        setShowNotification(true);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isNavigating, onBikeUpdate]);

  const handleExitNavigation = useCallback(() => {
    setIsNavigating(false);
    setDirections(null);
    setCurrentStep(0);
    setCurrentPosition(null);
    setNavigatingBikeId(null);
    setSelectedBike(null);
    if (navigationInterval.current) {
      clearInterval(navigationInterval.current);
    }
    if (mapRef.current) {
      const newCenter = userLocation || defaultCenter;
      setMapCenter(newCenter);
      setMapZoom(12);
      mapRef.current.panTo(newCenter);
      mapRef.current.setZoom(12);
    }
  }, [userLocation]);

  const handleUpdateYes = useCallback(() => {
    setShowNotification(false);
    if (updatedBike && newLocation) {
      console.log('Updating directions for bike:', updatedBike);
      handleGetDirections(updatedBike);
    }
  }, [updatedBike, newLocation, handleGetDirections]);

  const handleUpdateNo = useCallback(() => {
    setShowNotification(false);
    handleExitNavigation();
  }, [handleExitNavigation]);

  const uniqueMakes = useMemo(() => {
    return [...new Set(bikes.map(bike => bike.make))];
  }, [bikes]);

  const getMarkerColor = useCallback((lastSignal) => {
    const now = new Date();
    const lastSignalDate = new Date(lastSignal);
    const diffHours = (now - lastSignalDate) / (1000 * 60 * 60);

    if (diffHours < 1) return "green";
    if (diffHours < 24) return "orange";
    return "red";
  }, []);

  const createMarkerIcon = useCallback((color) => {
    if (!window.google) {
      console.error('Google Maps not loaded, cannot create marker icon');
      return null;
    }
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeWeight: 0,
      scale: 8
    };
  }, []);

  const handleMarkerClick = useCallback((bike) => {
    console.log('Marker clicked:', bike);
    setSelectedBike(bike);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedBike(null);
  }, []);

  const handleGoToBike = useCallback((bikeId) => {
    navigate(`/bike/${bikeId}`);
  }, [navigate]);

  const filteredBikes = useMemo(() => {
    if (!bikes) return [];
    let filtered = isAdmin ? bikes : bikes.filter(bike => preferredManufacturers.includes(bike.make));
    
    // Apply search term
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(bike => 
        bike.make.toLowerCase().includes(lowercasedSearch) ||
        bike.model.toLowerCase().includes(lowercasedSearch) ||
        bike.serialNumber.toLowerCase().includes(lowercasedSearch)
      );
    }

    // Apply filters
    if (filterOptions.make) {
      filtered = filtered.filter(bike => bike.make === filterOptions.make);
    }
    if (filterOptions.status) {
      filtered = filtered.filter(bike => bike.status === filterOptions.status);
    }
    if (filterOptions.timeFrame) {
      const now = new Date();
      const timeFrameHours = parseInt(filterOptions.timeFrame);
      filtered = filtered.filter(bike => {
        const lastSignalDate = new Date(bike.lastSignal);
        const diffHours = (now - lastSignalDate) / (1000 * 60 * 60);
        return diffHours <= timeFrameHours;
      });
    }

    return filtered;
  }, [bikes, isAdmin, preferredManufacturers, searchTerm, filterOptions]);

  useEffect(() => {
    if (!map || !window.google) return;

    console.log('Setting up map with filtered bikes:', filteredBikes);
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidLocations = false;

    filteredBikes.forEach((bike) => {
      if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
        const lat = bike.location.coordinates[1];
        const lng = bike.location.coordinates[0];
        if (isFinite(lat) && isFinite(lng)) {
          console.log('Adding bike to bounds:', bike, 'at position:', { lat, lng });
          bounds.extend({ lat, lng });
          hasValidLocations = true;
        } else {
          console.warn('Invalid coordinates for bike:', bike);
        }
      } else {
        console.warn('Invalid bike location:', bike);
      }
    });

    if (userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng)) {
      bounds.extend(userLocation);
      hasValidLocations = true;
    }

    if (hasValidLocations) {
      console.log('Fitting bounds to map');
      map.fitBounds(bounds);
    } else {
      console.warn('No valid locations found, using default center');
      map.setCenter(defaultCenter);
      map.setZoom(12);
    }
  }, [map, filteredBikes, userLocation]);

  const calculateDistancesAndSort = useCallback(async () => {
    if (!userLocation || !filteredBikes.length || !window.google) return;
    
    const service = new window.google.maps.DistanceMatrixService();
    const destinations = filteredBikes.map(bike => ({
      lat: bike.location.coordinates[1],
      lng: bike.location.coordinates[0]
    }));
  
    try {
      const response = await service.getDistanceMatrix({
        origins: [userLocation],
        destinations: destinations,
        travelMode: 'DRIVING',
        unitSystem: window.google.maps.UnitSystem.METRIC
      });
  
      const bikesWithDistance = filteredBikes.map((bike, index) => ({
        ...bike,
        distance: response.rows[0].elements[index].distance.value,
        duration: response.rows[0].elements[index].duration.value
      }));
  
      const sorted = bikesWithDistance.sort((a, b) => a.duration - b.duration);
      setSortedBikes(sorted);
    } catch (error) {
      console.error('Error calculating distances:', error);
    }
  }, [userLocation, filteredBikes]);

  useEffect(() => {
    if (mapLoaded && userLocation) {
      calculateDistancesAndSort();
    }
  }, [mapLoaded, userLocation, filteredBikes, calculateDistancesAndSort]);

  useEffect(() => {
    if (mapLoaded && userLocation) {
      calculateDistancesAndSort();
    }
  }, [mapLoaded, userLocation, bikes, calculateDistancesAndSort]);

  useEffect(() => {
    if (isNavigating && directions && mapRef.current) {
      const steps = directions.routes[0].legs[0].steps;
      
      navigationInterval.current = setInterval(() => {
        setCurrentStep((prevStep) => {
          if (prevStep < steps.length - 1) {
            const nextStep = prevStep + 1;
            setCurrentPosition(steps[nextStep].start_location);
            mapRef.current.panTo(steps[nextStep].start_location);
            return nextStep;
          } else {
            clearInterval(navigationInterval.current);
            return prevStep;
          }
        });
      }, 4000); // Move to next step every 4 seconds
    }

    return () => {
      if (navigationInterval.current) {
        clearInterval(navigationInterval.current);
      }
    };
  }, [isNavigating, directions]);

  useEffect(() => {
    if (isLoaded && userLocation && filteredBikes.length > 0) {
      calculateDistancesAndSort();
    }
  }, [isLoaded, userLocation, filteredBikes, calculateDistancesAndSort]);

  const onMapLoad = useCallback((map) => {
    console.log('Map loaded');
    mapRef.current = map;
    setMapLoaded(true);
    setMap(map);
  }, []);

  useEffect(() => {
    if (mapLoaded && map && window.google && sortedBikes.length > 0) {
      console.log('Setting up map with sorted bikes:', sortedBikes);
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidLocations = false;

      sortedBikes.forEach((bike) => {
        if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
          const lat = bike.location.coordinates[1];
          const lng = bike.location.coordinates[0];
          if (isFinite(lat) && isFinite(lng)) {
            bounds.extend({ lat, lng });
            hasValidLocations = true;
          }
        }
      });

      if (userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng)) {
        bounds.extend(userLocation);
        hasValidLocations = true;
      }

      if (hasValidLocations) {
        console.log('Fitting bounds to map');
        map.fitBounds(bounds);
      } else {
        console.warn('No valid locations found, using default center');
        map.setCenter(defaultCenter);
        map.setZoom(12);
      }
    }
  }, [mapLoaded, map, sortedBikes, userLocation]);

  const renderMarkers = useCallback(() => {
    console.log('Rendering markers, sortedBikes:', sortedBikes);
    return sortedBikes.map((bike, index) => {
      if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
        const lat = bike.location.coordinates[1];
        const lng = bike.location.coordinates[0];
        if (isFinite(lat) && isFinite(lng)) {
          const markerColor = getMarkerColor(bike.lastSignal);
          console.log('Creating marker for bike:', bike._id, 'at position:', { lat, lng }, 'with color:', markerColor);
          return (
            <Marker
              key={bike._id || index}
              position={{ lat, lng }}
              icon={createMarkerIcon(markerColor)}
              onClick={() => handleMarkerClick(bike)}
            />
          );
        }
      }
      return null;
    }).filter(Boolean);
  }, [sortedBikes, getMarkerColor, createMarkerIcon, handleMarkerClick]);

  useEffect(() => {
    if (sortedBikes.length > 0 && userLocation) {
      const prioritizedBikes = prioritizeBikes(sortedBikes, userLocation);
      setSuggestedBike(prioritizedBikes[0]); // Only set the first suggested bike
    }
  }, [sortedBikes, userLocation]);

  const handleLetsGo = useCallback(() => {
    if (suggestedBike) {
      handleGetDirections(suggestedBike);
    }
  }, [suggestedBike, handleGetDirections]);

  const renderSuggestedBike = () => (
    suggestedBike && (
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: showSidebar ? 320 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute top-4 left-4 w-64 z-20"
      >
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Suggested Bike</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 p-2 bg-gray-100 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">{suggestedBike.make} {suggestedBike.model}</span>
              </div>
              <div className="text-sm text-gray-600 flex items-center mt-1">
                <Clock size={14} className="mr-1" />
                Last Signal: {formatTimeDifference(new Date(suggestedBike.lastSignal))}
              </div>
              {suggestedBike.duration && (
                <div className="text-sm text-gray-600">
                  Driving Time: {formatDuration(suggestedBike.duration)}
                </div>
              )}
              <Button 
                onClick={handleLetsGo}
                className="w-full mt-2 flex items-center justify-center"
              >
                <Navigation size={16} className="mr-1" />
                Let's Go!
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  );

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps</div>;
  }

  return (
    <div className="relative h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onMapLoad}
        onClick={() => setSelectedBike(null)}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {mapLoaded && (
          <>
            {/* Render markers */}
            {renderMarkers()}

            {/* Render user location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={userLocationIcon}
              />
            )}

            {/* Render selected bike info window */}
            {selectedBike && (
              <InfoWindow
                position={{
                  lat: selectedBike.location.coordinates[1],
                  lng: selectedBike.location.coordinates[0]
                }}
                onCloseClick={() => setSelectedBike(null)}
              >
                <div className="info-window-content">
                  <h3 className="font-bold text-lg mb-2">{selectedBike.make} {selectedBike.model}</h3>
                  <p className="mb-1">Serial: {selectedBike.serialNumber}</p>
                  {selectedBike.lastSignal && (
                    <p className="mb-2">Last Signal: {new Date(selectedBike.lastSignal).toLocaleString()}</p>
                  )}
                  <div className="flex space-x-2">
                    <Button onClick={() => handleGetDirections(selectedBike)} className="text-sm">
                      Get Directions
                    </Button>
                    <Button onClick={() => handleGoToBike(selectedBike._id)} className="text-sm">
                      Go to Bike
                    </Button>
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Render directions */}
            {isNavigating && directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#4285F4",
                    strokeWeight: 5
                  }
                }}
              />
            )}
          </>
        )}
      </GoogleMap>

      {renderSuggestedBike()}

      <Button
        className="absolute top-4 left-4 z-30"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <X size={20} /> : <Filter size={20} />}
      </Button>
  
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 h-full w-80 bg-white shadow-lg p-4 z-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Filters</h2>
              <Button variant="ghost" onClick={() => setShowSidebar(false)}>
                <X size={20} />
              </Button>
            </div>
            <div className="space-y-4">
              {/* ... (keep existing filter inputs) */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    <Button
      className="absolute top-4 left-4 z-10"
      onClick={() => setShowSidebar(!showSidebar)}
    >
      {showSidebar ? <X size={20} /> : <Filter size={20} />}
    </Button>
  
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 h-full w-80 bg-white shadow-lg p-4 z-20"
          >
            <h2 className="text-2xl font-bold mb-4">Filters</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search bikes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </div>
              <div>
                <Label htmlFor="make">Manufacturer</Label>
                <Select
                  id="make"
                  value={filterOptions.make}
                  onChange={(e) => setFilterOptions({...filterOptions, make: e.target.value})}
                >
                  <option value="">All</option>
                  {uniqueMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={filterOptions.status}
                  onChange={(e) => setFilterOptions({...filterOptions, status: e.target.value})}
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeFrame">Last Signal</Label>
                <Select
                  id="timeFrame"
                  value={filterOptions.timeFrame}
                  onChange={(e) => setFilterOptions({...filterOptions, timeFrame: e.target.value})}
                >
                  <option value="">All</option>
                  <option value="1">Last 1 hour</option>
                  <option value="24">Last 24 hours</option>
                  <option value="168">Last 7 days</option>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
  
      {isNavigating && (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 bg-white p-4 shadow-lg rounded-t-lg"
        >
          <h3 className="text-lg font-semibold mb-2">Navigation</h3>
          <p className="mb-2">Next step: {directions?.routes[0].legs[0].steps[currentStep].instructions}</p>
          <div className="flex justify-between">
            <Button onClick={handleExitNavigation} variant="secondary">
              Exit Navigation
            </Button>
            <Button onClick={() => setCurrentStep(prev => Math.min(prev + 1, directions?.routes[0].legs[0].steps.length - 1))}>
              Next Step
            </Button>
          </div>
        </motion.div>
      )}
  
      <AnimatePresence>
        {showNotification && (
          <Notification
            message="New coordinates available for the bike. Update?"
            onYes={handleUpdateYes}
            onNo={handleUpdateNo}
            onClose={() => setShowNotification(false)}
          />
        )}
      </AnimatePresence>
  
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg max-h-[calc(100vh-32px)] overflow-y-auto"
      >
        <h3 className="text-lg font-semibold mb-2">Bikes ({sortedBikes.length})</h3>
        <ul className="space-y-2">
          {sortedBikes.map(bike => (
            <li key={bike._id} className="flex flex-col">
              <div className="flex items-center justify-between">
                <span>{bike.make} {bike.model}</span>
                <Button 
                  size="sm" 
                  onClick={() => handleMarkerClick(bike)}
                  className="flex items-center"
                >
                  <Bike size={16} className="mr-1" />
                  View
                </Button>
              </div>
              <span className="text-xs italic text-gray-500">
                Last Signal: {new Date(bike.lastSignal).toLocaleString()}
              </span>
              {bike.duration && (
                <span className="text-xs text-gray-500">
                  Driving Time: {Math.round(bike.duration / 60)} mins
                </span>
              )}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

export default React.memo(Map);