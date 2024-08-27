import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { Bike, FileText, MessageSquare, MapPin, ArrowLeft, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import api from '../services/api';

const libraries = ["places"];
const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const BikePage = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState(null);
  const [missingReport, setMissingReport] = useState(null);
  const [showMissingReportForm, setShowMissingReportForm] = useState(false);
  const [locations, setLocations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(12);
  const [bikebustersLocations, setBikebustersLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showFoundPopup, setShowFoundPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLostPopup, setShowLostPopup] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const fetchBikeData = async () => {
      try {
        setLoading(true);
        const [bikeResponse, missingReportResponse, locationsResponse, notesResponse, bikebustersLocationsResponse] = await Promise.all([
          api.get(`/bikes/${bikeId}`),
          api.get(`/bikes/${bikeId}/missing-report`),
          api.get(`/bikes/${bikeId}/locations`),
          api.get(`/bikes/${bikeId}/notes`),
          api.get('/bikebusterslocations')
        ]);
        
        setBike(bikeResponse.data);
        setMissingReport(missingReportResponse.data);
        setLocations(locationsResponse.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setNotes(notesResponse.data);
        setBikebustersLocations(bikebustersLocationsResponse.data);
        setShowMissingReportForm(!missingReportResponse.data);

        if (locationsResponse.data.length > 0) {
          const [lng, lat] = locationsResponse.data[0].location.coordinates;
          setMapCenter({ lat, lng });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching bike data:', err);
        setError('Failed to load bike data. Please try again.');
        setLoading(false);
      }
    };

    fetchBikeData();
  }, [bikeId]);

  const handleAddNote = async () => {
    try {
      const response = await api.post(`/bikes/${bikeId}/notes`, { content: newNote });
      setNotes([...notes, response.data]);
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    }
  };

  const handleSubmitMissingReport = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const reportData = Object.fromEntries(formData.entries());
      const response = await api.post(`/bikes/${bikeId}/missing-report`, reportData);
      setMissingReport(response.data);
      setShowMissingReportForm(false);
    } catch (err) {
      console.error('Error submitting missing report:', err);
      setError('Failed to submit missing report. Please try again.');
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleFoundClick = () => {
    setShowFoundPopup(true);
  };

  const handleLostClick = () => {
    setShowLostPopup(true);
  };

  const handleConfirmLost = async () => {
    try {
      const response = await api.post(`/bikes/${bikeId}/lost`);
      if (response.data.success) {
        setBike({ ...bike, reportStatus: 'lost' });
        setSuccessMessage('Bike marked as lost');
      }
    } catch (error) {
      console.error('Error marking bike as lost:', error);
      setError('Failed to mark bike as lost. Please try again.');
    } finally {
      setShowLostPopup(false);
    }
  };

  const handleCloseLostPopup = () => {
    setShowLostPopup(false);
  };

  const handleCloseFoundPopup = () => {
    setShowFoundPopup(false);
    setSelectedLocation('');
    setNewNote('');
  };

  const handleFoundSubmit = async () => {
    try {
      const response = await api.post(`/bikes/${bikeId}/found`, {
        bikebustersLocationId: selectedLocation,
        notes: newNote
      });

      setBike({ ...bike, reportStatus: 'resolved' });
      setShowFoundPopup(false);
      setSuccessMessage('Bike marked as found and recovery recorded');
    } catch (error) {
      console.error('Error marking bike as found:', error);
      setError('Failed to mark bike as found. Please try again.');
    }
  };

  const handleMarkAsLost = async () => {
    try {
      const response = await api.post(`/bikes/${bikeId}/lost`);
      if (response.data.success) {
        setBike({ ...bike, reportStatus: 'lost' });
        setSuccessMessage('Bike marked as lost');
      }
    } catch (error) {
      console.error('Error marking bike as lost:', error);
      setError('Failed to mark bike as lost. Please try again.');
    }
  };

  const onMapLoad = useCallback((map) => {
    if (locations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach((location) => {
        bounds.extend(new window.google.maps.LatLng(
          location.location.coordinates[1],
          location.location.coordinates[0]
        ));
      });
      map.fitBounds(bounds);
    }
  }, [locations]);

  const polylinePath = locations.map(location => ({
    lat: location.location.coordinates[1],
    lng: location.location.coordinates[0]
  }));

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!bike) return <div>Bike not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button onClick={handleBackClick} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2" size={20} />
        Back to All Bikes
      </Button>

      <h1 className="text-3xl font-bold mb-6">{bike.make} {bike.model}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bike Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Serial Number:</strong> {bike.serialNumber}</p>
            <p><strong>Status:</strong> {bike.reportStatus}</p>
            <p><strong>Reported Missing:</strong> {new Date(bike.reportDate).toLocaleString()}</p>
            <p><strong>Last Signal:</strong> {bike.lastSignal ? new Date(bike.lastSignal).toLocaleString() : 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Missing Report</CardTitle>
          </CardHeader>
          <CardContent>
            {missingReport ? (
              <>
                <p><strong>Last Seen:</strong> {new Date(missingReport.lastSeenOn).toLocaleString()}</p>
                <p><strong>Reported Missing:</strong> {new Date(missingReport.missingSince).toLocaleString()}</p>
                <p><strong>Reported By:</strong> {missingReport.memberEmail}</p>
              </>
            ) : showMissingReportForm ? (
              <form onSubmit={handleSubmitMissingReport} className="space-y-4">
                <div>
                  <Label htmlFor="lastSeenOn">Last Seen</Label>
                  <Input type="datetime-local" id="lastSeenOn" name="lastSeenOn" required />
                </div>
                <div>
                  <Label htmlFor="missingSince">Reported Missing</Label>
                  <Input type="datetime-local" id="missingSince" name="missingSince" required />
                </div>
                <div>
                  <Label htmlFor="memberEmail">Reporter Email</Label>
                  <Input type="email" id="memberEmail" name="memberEmail" required />
                </div>
                <Button type="submit">Submit Missing Report</Button>
              </form>
            ) : (
              <p>No missing report available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6"
          role="alert"
        >
          <p>{successMessage}</p>
        </motion.div>
      )}

<div className="flex space-x-4 my-6">
        <Button onClick={handleFoundClick} disabled={bike.reportStatus === 'resolved'}>Mark as Found</Button>
        <Button onClick={handleLostClick} variant="destructive" disabled={bike.reportStatus === 'lost'}>Mark as Lost</Button>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6"
          role="alert"
        >
          <p>{successMessage}</p>
        </motion.div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Location History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoaded && !loadError ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={mapZoom}
              center={mapCenter}
              onLoad={onMapLoad}
            >
              {locations.map((location, index) => {
                const [lng, lat] = location.location.coordinates;
                return (
                  <Marker
                    key={location._id}
                    position={{ lat, lng }}
                    label={{
                      text: (index + 1).toString(),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                );
              })}
              <Polyline
                path={polylinePath}
                options={{
                  strokeColor: "#FF0000",
                  strokeOpacity: 1.0,
                  strokeWeight: 2
                }}
              />
            </GoogleMap>
          ) : (
            <div>Error loading map: {loadError ? loadError.message : 'Unknown error'}</div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note._id} className="bg-gray-100 p-3 rounded">
                <p>{note.content}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="mt-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a new note..."
                rows={3}
              />
              <Button onClick={handleAddNote} className="mt-2">Add Note</Button>
            </div>
          </div>
        </CardContent>
      </Card>

    {showFoundPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <Card className="w-96 relative">
            <Button
              onClick={handleCloseFoundPopup}
              variant="ghost"
              className="absolute top-2 right-2 p-1"
            >
              <X size={20} />
            </Button>
            <CardHeader>
              <CardTitle>Where will the bike be returned?</CardTitle>
            </CardHeader>
            <CardContent>
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
              <div className="mt-4">
                <Label htmlFor="note">Add a Note</Label>
                <Input
                  id="note"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note (optional)"
                />
              </div>
              <Button onClick={handleFoundSubmit} className="mt-4">
                Submit
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {showLostPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <Card className="w-96 relative">
            <Button
              onClick={handleCloseLostPopup}
              variant="ghost"
              className="absolute top-2 right-2 p-1"
            >
              <X size={20} />
            </Button>
            <CardHeader>
              <CardTitle>Confirm Mark as Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Are you sure you want to mark this bike as lost? This action cannot be undone and will remove the bike from active tracking.</p>
              <div className="flex justify-end space-x-2">
                <Button onClick={handleCloseLostPopup} variant="outline">Cancel</Button>
                <Button onClick={handleConfirmLost} variant="destructive">Confirm</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default BikePage;