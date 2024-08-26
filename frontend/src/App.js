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

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


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
    }, 0.5 * 60 * 1000); // Check every 4 minutes

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
            {isAuthenticated && (
              <>
                <li><Link to="/map" className="hover:underline">Map</Link></li>
                <li><Link to="/dashboard" className="hover:underline">Dashboard</Link></li>
                <li><Link to="/bikes" className="hover:underline">Bike List</Link></li>
              </>
            )}
            {!isAuthenticated && <li><button onClick={() => setView('report')} className="hover:underline">Report Stolen Bike</button></li>}
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
                <Navigate to="/map" replace />
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
            <Route path="/map" element={
              <ProtectedRoute>
                <Map 
                  bikes={bikeData.bikes}
                  userLocation={userLocation}
                  isAdmin={isAdmin}
                  preferredManufacturers={user?.preferredManufacturers || []}
                  onBikeUpdate={handleBikeUpdate}
                />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/bikes" element={
              <ProtectedRoute>
                <BikeList isAdmin={isAdmin} preferredManufacturers={user?.preferredManufacturers || []} />
              </ProtectedRoute>
            } />
            <Route path="/bike/:bikeId" element={
              <ProtectedRoute>
                <BikePage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/map" : "/"} replace />} />
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