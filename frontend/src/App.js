import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import InitialChoice from './components/InitialChoice';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ReportStolenBike from './components/ReportStolenBike';
import BikeList from './components/BikeList';
import Map from './components/Map';
import api from './services/api';
import BikePage from './components/BikePage';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [view, setView] = useState('initial');
  const [showRegister, setShowRegister] = useState(false);
  const [bikeData, setBikeData] = useState({ bikes: [], manufacturers: [] });
  const [userLocation, setUserLocation] = useState(null);

  const handleChoiceSelected = (choice) => {
    setView(choice === 'report' ? 'report' : 'login');
  };

  const handleReportSubmission = useCallback((reportData) => {
    console.log('Report submitted:', reportData);
    setView('home');
  }, []);

  const toggleRegister = () => {
    setShowRegister(!showRegister);
  };

  const handleGoBack = useCallback(() => {
    setView('initial');
  }, []);

  const fetchBikes = useCallback(async () => {
    try {
      const response = await api.get('/bikes');
      setBikeData(response.data);
    } catch (error) {
      console.error('Error fetching bikes:', error);
    }
  }, []);

  const { checkAuth } = useAuth();

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkAuth();
    }, 4 * 60 * 1000); // Check every 4 minutes

    return () => clearInterval(intervalId);
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBikes();
    }
  }, [isAuthenticated, fetchBikes]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.log("Geolocation is not available in your browser.");
    }
  }, []);

  const handleBikeUpdate = useCallback((updatedBike, newLocation) => {
    setBikeData(prevData => {
      const updatedBikes = prevData.bikes.map(bike => 
        bike._id === updatedBike._id ? { ...bike, ...updatedBike, location: newLocation } : bike
      );
      return { ...prevData, bikes: updatedBikes };
    });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <nav className="bg-primary text-primary-foreground p-4">
          <ul className="flex space-x-4">
            <li><Link to="/" className="hover:underline">Dashboard</Link></li>
            {!isAuthenticated && <li><button onClick={() => setView('report')} className="hover:underline">Report Stolen Bike</button></li>}
            {isAuthenticated && (
              <>
                <li><Link to="/bikes" className="hover:underline">Bike List</Link></li>
                <li><Link to="/map" className="hover:underline">Map</Link></li>
              </>
            )}
          </ul>
        </nav>

        <main className="container mx-auto mt-8 p-4">
          {isAuthenticated ? (
            <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
          ) : view !== 'report' && (
            <button onClick={toggleRegister} className="bg-blue-500 text-white px-4 py-2 rounded">
              {showRegister ? 'Switch to Login' : 'Switch to Register'}
            </button>
          )}

          <Routes>
            <Route path="/" element={
              isAuthenticated ? (
                <Dashboard />
              ) : view === 'initial' ? (
                <InitialChoice onChoiceSelected={handleChoiceSelected} />
              ) : view === 'login' ? (
                showRegister ? (
                  <Register onRegister={() => setView('home')} onGoBack={handleGoBack} />
                ) : (
                  <Login onLogin={() => setView('home')} onGoBack={handleGoBack} />
                )
              ) : view === 'report' ? (
                <ReportStolenBike onSubmit={handleReportSubmission} onGoBack={handleGoBack} />
              ) : (
                <Navigate to="/login" replace />
              )
            } />
            <Route path="/bikes" element={
              isAuthenticated ? (
                <BikeList isAdmin={isAdmin} preferredManufacturers={user?.preferredManufacturers || []} />
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="/map" element={
              isAuthenticated ? (
                <Map 
                  bikes={bikeData.bikes}
                  userLocation={userLocation}
                  isAdmin={isAdmin}
                  preferredManufacturers={user?.preferredManufacturers || []}
                  onBikeUpdate={handleBikeUpdate}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="/bike/:bikeId" element={
              isAuthenticated ? (
                <BikePage />
              ) : (
                <Navigate to="/" replace />
              )
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;