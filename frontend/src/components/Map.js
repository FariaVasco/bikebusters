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

const libraries = ["geometry"];

function Map({ bikes = [], userLocation, isAdmin, preferredManufacturers }) {
  const [map, setMap] = useState(null);
  const [selectedBike, setSelectedBike] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const mapRef = useRef(null);
  const navigationInterval = useRef(null);
  const filteredBikes = useMemo(() => {
    if (!Array.isArray(bikes)) return [];
    return isAdmin ? bikes : bikes.filter(bike => preferredManufacturers.includes(bike.make));
  }, [bikes, isAdmin, preferredManufacturers]);
  const navigate = useNavigate();

  const getMarkerColor = useCallback((lastSignal) => {
    const now = new Date();
    const lastSignalDate = new Date(lastSignal);
    const diffHours = (now - lastSignalDate) / (1000 * 60 * 60);

    if (diffHours < 1) return "green";
    if (diffHours < 24) return "orange";
    return "red";
  }, []);

  const createMarkerIcon = useCallback((color) => {
    if (!googleMapsLoaded || !window.google) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeWeight: 0,
      scale: 8
    };
  }, [googleMapsLoaded]);

  const handleGoToBike = useCallback((bikeId) => {
    navigate(`/bike/${bikeId}`);
  }, [navigate]);

  const personIcon = useCallback(() => {
    if (!googleMapsLoaded || !window.google) return null;
    return {
      path: 'M10.5,0 C7.85,0 5.7,2.15 5.7,4.8 C5.7,7.45 7.85,9.6 10.5,9.6 C13.15,9.6 15.3,7.45 15.3,4.8 C15.3,2.15 13.15,0 10.5,0 Z M0,18.3 C0,14.7 7,11.4 10.5,11.4 C14,11.4 21,14.7 21,18.3 L21,21 L0,21 L0,18.3 Z',
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeWeight: 0,
      rotation: 0,
      scale: 1.5,
      anchor: new window.google.maps.Point(10.5, 21),
    };
  }, [googleMapsLoaded]);

  const customIcon = {
    path: "M-1.547 12l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM0 0q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
    fillColor: "red",
    fillOpacity: 0.8,
    strokeWeight: 0,
    rotation: 0,
    scale: 1,
  };

  const onLoad = useCallback((map) => {
    console.log('Map loaded');
    mapRef.current = map;
    setMap(map);
    setGoogleMapsLoaded(true);
    let hasValidLocations = false;

    const bounds = new window.google.maps.LatLngBounds();
    filteredBikes.forEach((bike) => {
      if (bike && bike.location && Array.isArray(bike.location.coordinates) && bike.location.coordinates.length === 2) {
        bounds.extend({
          lat: bike.location.coordinates[1],
          lng: bike.location.coordinates[0]
        });
        hasValidLocations = true;
      }
    });
    if (userLocation && userLocation.lat && userLocation.lng) {
      bounds.extend(userLocation);
      hasValidLocations = true;
    }
    if (hasValidLocations) {
      map.fitBounds(bounds);
    } else {
      map.setCenter(defaultCenter);
      map.setZoom(12);
    }
  }, [filteredBikes, userLocation]);

  const handleMarkerClick = useCallback((bike) => {
    setSelectedBike(bike);
  }, []);
  const handleInfoWindowClose = useCallback(() => {
    setSelectedBike(null);
  }, []);
  const handleGetDirections = useCallback((bike) => {
    if (!userLocation) {
      alert("User location is not available. Please enable location services.");
      return;
    }

    if (!googleMapsLoaded || !window.google) {
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
  }, [userLocation, googleMapsLoaded]);

  const handleExitNavigation = useCallback(() => {
    setIsNavigating(false);
    setDirections(null);
    setCurrentStep(0);
    setCurrentPosition(null);
    if (navigationInterval.current) {
      clearInterval(navigationInterval.current);
    }
  }, []);

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
      }, 4000); // Move to next step every 3 seconds
    }

    return () => {
      if (navigationInterval.current) {
        clearInterval(navigationInterval.current);
      }
    };
  }, [isNavigating, directions]);

  return (
    <LoadScript 
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
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
          {map && googleMapsLoaded && !isNavigating && filteredBikes.map((bike) => {
            if (bike.location && bike.location.coordinates) {
              const lat = bike.location.coordinates[1];
              const lng = bike.location.coordinates[0];
              const markerColor = getMarkerColor(bike.lastSignal);
              return (
                <Marker
                  key={bike._id}
                  position={{ lat, lng }}
                  icon={createMarkerIcon(markerColor)}
                  onClick={() => handleMarkerClick(bike)}
                />
              );
            }
            return null;
          })}

          {userLocation && googleMapsLoaded && !isNavigating && (
            <Marker
              position={userLocation}
              icon={personIcon()}
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