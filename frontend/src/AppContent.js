import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import InitialChoice from './components/InitialChoice';
import Login from './components/Login';
import Register from './components/Register';
import ReportStolenBike from './components/ReportStolenBike';
import BikeList from './components/BikeList';
import BikePage from './components/BikePage';
import Map from './components/Map';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [view, setView] = useState('initial');
  const [showRegister, setShowRegister] = useState(false);

  const toggleRegister = () => {
    setShowRegister(!showRegister);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <nav className="bg-primary text-primary-foreground p-4">
          <ul className="flex space-x-4">
            <li><Link to="/" className="hover:underline">Home</Link></li>
            {!isAuthenticated && <li><Link to="/report" className="hover:underline">Report Stolen Bike</Link></li>}
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
              isAuthenticated ? <Navigate to="/bikes" replace /> : <InitialChoice />
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/report" element={<ReportStolenBike />} />
            <Route path="/bikes" element={
              <ProtectedRoute>
                <BikeList />
              </ProtectedRoute>
            } />
            <Route path="/bike/:bikeId" element={
              <ProtectedRoute>
                <BikePage />
              </ProtectedRoute>
            } />
            <Route path="/map" element={
              <ProtectedRoute>
                <Map />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default AppContent;