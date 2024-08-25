import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, FileText, MessageSquare, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import api from '../services/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';

const libraries = ["places", "geometry"];

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const BikePage = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState(null);
  const [locations, setLocations] = useState([]);
  const [missingReport, setMissingReport] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bikebustersLocations, setBikebustersLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showFoundPopup, setShowFoundPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 52.3676, lng: 4.9041 });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  const fetchBikeData = useCallback(async () => {
    try {
      setLoading(true);
      const [bikeResponse, locationsResponse, reportResponse, notesResponse, bikebustersLocationsResponse] = await Promise.all([
        api.get(`/bikes/${bikeId}`),
        api.get(`/bikes/${bikeId}/locations`),
        api.get(`/bikes/${bikeId}/missing-report`),
        api.get(`/bikes/${bikeId}/notes`),
        api.get('/bikebusterslocations')
      ]);
      
      console.log('Bike data:', bikeResponse.data);
      console.log('Locations data:', locationsResponse.data);
      
      setBike(bikeResponse.data);
      setLocations(locationsResponse.data);
      setMissingReport(reportResponse.data);
      setNotes(notesResponse.data);
      setBikebustersLocations(bikebustersLocationsResponse.data);
      
      if (locationsResponse.data.length > 0) {
        const lastLocation = locationsResponse.data[0];
        if (lastLocation.location && lastLocation.location.coordinates) {
          setMapCenter({
            lat: lastLocation.location.coordinates[1],
            lng: lastLocation.location.coordinates[0]
          });
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bike data:', err);
      setError('Failed to load bike data. Please try again.');
      setLoading(false);
    }
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

  const handleBackClick = () => {
    navigate('/');
  };

  const handleFoundClick = () => {
    setShowFoundPopup(true);
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
      
      if (response.data.recovery) {
        setRecovery(response.data.recovery);
      }
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
        // You might want to show a success message here
      }
    } catch (error) {
      console.error('Error marking bike as lost:', error);
      setError('Failed to mark bike as lost. Please try again.');
    }
  };

  useEffect(() => {
    fetchBikeData();
  }, [fetchBikeData]);

  useEffect(() => {
    console.log('Component updated. Locations:', locations);
  }, [locations]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-8">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p>{error}</p>
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="text-center text-gray-500 mt-8">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p>Bike not found</p>
      </div>
    );
  }

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      <Button onClick={handleBackClick} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2" size={20} />
        Back to All Bikes
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{bike.make} {bike.model}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Serial Number</p>
              <p className="font-semibold">{bike.serialNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold">{bike.reportStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Signal</p>
              <p className="font-semibold">{bike.lastSignal ? new Date(bike.lastSignal).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {missingReport && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Missing Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Last Seen</p>
                <p className="font-semibold">{new Date(missingReport.lastSeenOn).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reported Missing</p>
                <p className="font-semibold">{new Date(missingReport.missingSince).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Member Email</p>
                <p className="font-semibold">{missingReport.memberEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showFoundPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <Card className="w-96">
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

<div className="flex space-x-4 mb-8">
        {bike.reportStatus !== 'resolved' && bike.reportStatus !== 'lost' && (
          <>
            <Button onClick={handleFoundClick}>Mark as Found</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Mark as Lost</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently mark the bike as lost and remove it from active tracking.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkAsLost}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-8"
          role="alert"
        >
          <p>{successMessage}</p>
        </motion.div>
      )}

      <Tabs defaultValue="locationData" className="mb-8">
        <TabsList>
          <TabsTrigger value="locationData"><MapPin className="mr-2" size={16} /> Location Data</TabsTrigger>
          <TabsTrigger value="bikeDetails"><FileText className="mr-2" size={16} /> Bike Details</TabsTrigger>
          <TabsTrigger value="notes"><MessageSquare className="mr-2" size={16} /> Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="locationData">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {locations.map((location, index) => {
              console.log('Rendering marker for location:', location);
              if (location.location && location.location.coordinates && location.location.coordinates.length === 2) {
                const [lng, lat] = location.location.coordinates;
                return (
                  <Marker
                    key={location._id}
                    position={{ lat, lng }}
                    label={{
                      text: (index + 1).toString(),  // Add the chronological number as the label
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: index === 0 ? "blue" : "red",
                      fillOpacity: 0.8,
                      strokeWeight: 0,
                      scale: 8
                    }}
                  />
                );
              }
              return null;
            })}
            {locations.length > 1 && (
              <Polyline
                path={locations.map(location => {
                  const [lng, lat] = location.location.coordinates;
                  return { lat, lng };
                })}
                options={{
                  strokeColor: "#4285F4",
                  strokeOpacity: 1,
                  strokeWeight: 2,
                }}
              />
            )}
          </GoogleMap>
        </TabsContent>
        <TabsContent value="bikeDetails">
  <Card>
    <CardContent>
      <p className="text-sm text-gray-500">Bike ID</p>
      <p className="font-semibold">{bike._id}</p>
      <Separator className="my-4" />
      <p className="text-sm text-gray-500">Owner</p>
      {bike.owner ? (
        <>
          <p className="font-semibold">{bike.owner.name}</p>
          <p className="text-sm text-gray-500">{bike.owner.email}</p>
        </>
      ) : (
        <p className="font-semibold">Owner information not available</p>
      )}
    </CardContent>
  </Card>
</TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardContent>
              <div className="mb-4">
                {notes.map(note => (
                  <div key={note._id} className="border-b border-gray-200 py-2">
                    <p className="text-sm text-gray-500">{new Date(note.createdAt).toLocaleString()}</p>
                    <p className="font-semibold">{note.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex">
                <Input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note"
                />
                <Button onClick={handleAddNote} className="ml-2">Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default BikePage;