import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import BikeList from './components/BikeList';
import api from './services/api';
import Register from './components/Register';
import Map from './components/Map';
import InitialChoice from './components/InitialChoice';
import ReportStolenBike from './components/ReportStolenBike';
import BikePage from './components/BikePage';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [preferredManufacturers, setPreferredManufacturers] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('initial'); // 'initial', 'report', 'login', 'main'

  const handleChoiceSelected = (choice) => {
    if (choice === 'report') {
      setView('report');
    } else {
      setView('login');
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('preferredManufacturers');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setPreferredManufacturers([]);
    setUser(null);
    setBikes([]);
  }, []);

  const fetchBikes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching bikes...');
      const response = await api.get('/bikes');
      console.log('API response:', response);
      console.log('Fetched bikes:', response.data);
      setBikes(response.data);
    } catch (error) {
      console.error('Error fetching bikes:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to fetch bikes. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await api.get('/auth/user');
      setUser(response.data);
      setIsAdmin(response.data.isAdmin);
      setPreferredManufacturers(response.data.preferredManufacturers || []);    
    } catch (error) {
      console.error('Error fetching user data:', error);
      handleLogout();
    }
  }, [handleLogout]);

  const handleLogin = useCallback((userData) => {
    console.log('Handling login with userData:', userData);
    localStorage.setItem('token', userData.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    setIsAuthenticated(true);
    setIsAdmin(userData.isAdmin);
    setPreferredManufacturers(userData.preferredManufacturers || []);
    fetchUserData();
    fetchBikes();
  }, [fetchUserData, fetchBikes]);

  const handleRegister = useCallback((userData) => {
    console.log('Handling registration with userData:', userData);
    localStorage.setItem('token', userData.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    setIsAuthenticated(true);
    setIsAdmin(userData.isAdmin);
    setPreferredManufacturers(userData.preferredManufacturers || []);
    fetchUserData();
    fetchBikes();
  }, [fetchUserData, fetchBikes]);

  const decodeToken = useCallback((token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = decodeToken(token);
      if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(decodedToken.user);
        fetchUserData();
        fetchBikes();
      } else {
        handleLogout();
      }
    } else {
      setLoading(false);
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log("User location set:", location);
          setUserLocation(location);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.log("Geolocation is not available in your browser.");
    }
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  if (view === 'initial') {
    return <InitialChoice onChoiceSelected={handleChoiceSelected} />;
  }

  if (view === 'report') {
    return <ReportStolenBike />;
  }

  if (!isAuthenticated) {
    return (
      <div>
        {showRegister ? (
          <Register onRegister={handleRegister} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
        <button onClick={() => setShowRegister(!showRegister)}>
          {showRegister ? 'Switch to Login' : 'Switch to Register'}
        </button>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            view === 'initial' ? (
              <InitialChoice onChoiceSelected={handleChoiceSelected} />
            ) : view === 'report' ? (
              <ReportStolenBike />
            ) : !isAuthenticated ? (
              <div>
                {showRegister ? (
                  <Register onRegister={handleRegister} />
                ) : (
                  <Login onLogin={handleLogin} />
                )}
                <button onClick={() => setShowRegister(!showRegister)}>
                  {showRegister ? 'Switch to Login' : 'Switch to Register'}
                </button>
              </div>
            ) : (
              <>
                <h1>BikeBusters</h1>
                <h2>Welcome {isAdmin ? 'Admin' : 'User'}</h2>
                <button onClick={handleLogout}>Logout</button>
                <BikeList 
                  isAdmin={isAdmin} 
                  preferredManufacturers={preferredManufacturers} 
                  bikes={bikes}
                />
                <Map 
                  bikes={bikes} 
                  userLocation={userLocation} 
                  isAdmin={isAdmin} 
                  preferredManufacturers={preferredManufacturers}
                />
              </>
            )
          } />
          <Route path="/bike/:bikeId" element={
            isAuthenticated ? <BikePage /> : <Navigate to="/" replace />
            } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;