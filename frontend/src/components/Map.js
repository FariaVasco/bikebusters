import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 52.3676,
  lng: 4.9041
};

const customIcon = {
  path: "M-1.547 12l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM0 0q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
  fillColor: "red",
  fillOpacity: 0.8,
  strokeWeight: 0,
  rotation: 0,
  scale: 1,
};

const libraries = ["geometry"];

function Map({ bikes, userLocation, isAdmin, preferredManufacturers = [] }) {
  const [map, setMap] = useState(null);
  const [selectedBike, setSelectedBike] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const mapRef = useRef(null);
  const navigationInterval = useRef(null);
  const navigate = useNavigate();

  const filteredBikes = useMemo(() => {
    console.log('Bikes received in Map:', bikes);
    if (!Array.isArray(bikes)) {
      console.error('Bikes is not an array:', bikes);
      return [];
    }
    const filtered = isAdmin ? bikes : bikes.filter(bike => preferredManufacturers.includes(bike.make));
    console.log('Filtered bikes:', filtered);
    return filtered;
  }, [bikes, isAdmin, preferredManufacturers]);

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

  const handleInfoWindowClose = useCallback(() => {
    setSelectedBike(null);
  }, []);

  const handleGoToBike = useCallback((bikeId) => {
    navigate(`/bike/${bikeId}`);
  }, [navigate]);

  const handleGetDirections = useCallback((bike) => {
    if (!userLocation) {
      alert("User location is not available. Please enable location services.");
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
          setCurrentPosition(result.routes[0].legs[0].start_location);
          setCurrentStep(0);
        } else {
          console.error(`error fetching directions ${result}`);
        }
      }
    );
  }, [userLocation]);

  const handleExitNavigation = useCallback(() => {
    setIsNavigating(false);
    setDirections(null);
    setCurrentStep(0);
    setCurrentPosition(null);
    if (navigationInterval.current) {
      clearInterval(navigationInterval.current);
    }
  }, []);

  const onLoad = useCallback((map) => {
    console.log('Map loaded');
    mapRef.current = map;
    setMap(map);
  }, []);

  useEffect(() => {
    if (!map || !window.google) return;

    console.log('Setting up map with filtered bikes:', filteredBikes);
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidLocations = false;

    filteredBikes.forEach((bike) => {
      if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
        const lat = bike.location.coordinates[1];
        const lng = bike.location.coordinates[0];
        console.log('Adding bike to bounds:', bike, 'at position:', { lat, lng });
        bounds.extend({ lat, lng });
        hasValidLocations = true;
      } else {
        console.warn('Invalid bike location:', bike);
      }
    });

    if (userLocation && userLocation.lat && userLocation.lng) {
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

  const renderMarkers = () => {
    return filteredBikes.map((bike, index) => {
      console.log('Attempting to create marker for bike:', bike);
      if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
        const lat = bike.location.coordinates[1];
        const lng = bike.location.coordinates[0];
        const markerColor = getMarkerColor(bike.lastSignal);
        console.log('Creating marker for bike:', bike, 'at position:', { lat, lng }, 'with color:', markerColor);
        return (
          <Marker
            key={bike._id || index}
            position={{ lat, lng }}
            icon={createMarkerIcon(markerColor)}
            onClick={() => handleMarkerClick(bike)}
          />
        );
      } else {
        console.warn('Invalid bike data, creating fallback marker:', bike);
        const fallbackLat = defaultCenter.lat + (index * 0.001);
        const fallbackLng = defaultCenter.lng + (index * 0.001);
        return (
          <Marker
            key={`fallback-${index}`}
            position={{ lat: fallbackLat, lng: fallbackLng }}
            icon={createMarkerIcon('purple')}
            onClick={() => console.log('Fallback marker clicked:', bike)}
          />
        );
      }
    });
  };

  return (
    <LoadScript 
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      onLoad={() => console.log('Google Maps script loaded')}
      onError={(error) => console.error('Error loading Google Maps:', error)}
    >
      <div style={{ position: 'relative', height: '400px' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={isNavigating && currentPosition ? currentPosition : (userLocation || defaultCenter)}
          zoom={isNavigating ? 18 : 12}
          onLoad={onLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
        <Marker
          position={defaultCenter}
          title="Test Marker"
          icon={{...customIcon, fillColor: "blue"}}
        />
          {map && window.google && !isNavigating && renderMarkers()}
          {userLocation && window.google && !isNavigating && (
            <Marker
              position={userLocation}
              title="Your Location"
            />
          )}
          {selectedBike && !isNavigating && (
            <InfoWindow
              position={{
                lat: selectedBike.location.coordinates[1],
                lng: selectedBike.location.coordinates[0]
              }}
              onCloseClick={handleInfoWindowClose}
            >
              <div>
                <h3>{selectedBike.make} {selectedBike.model}</h3>
                <p>Serial: {selectedBike.serialNumber}</p>
                {selectedBike.lastSignal && (
                  <p>Last Signal: {new Date(selectedBike.lastSignal).toLocaleString()}</p>
                )}
                <button onClick={() => handleGetDirections(selectedBike)}>Get Directions</button>
                <button onClick={() => handleGoToBike(selectedBike._id)}>Go to Bike</button>
              </div>
            </InfoWindow>
          )}
          {isNavigating && directions && (
            <>
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
              <Marker
                position={currentPosition}
                icon={{
                  path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 5,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeWeight: 1,
                }}
              />
            </>
          )}
        </GoogleMap>
        {isNavigating && (
          <div 
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              backgroundColor: 'white',
              padding: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            <p>Next step: {directions?.routes[0].legs[0].steps[currentStep].instructions}</p>
            <button onClick={handleExitNavigation}>Exit Navigation</button>
          </div>
        )}
      </div>
    </LoadScript>
  );
}

export default React.memo(Map);