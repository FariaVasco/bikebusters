import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
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

  const customIcon = {
    path: window.google?.maps?.SymbolPath?.CIRCLE || '',
    fillColor: "red",
    fillOpacity: 0.8,
    strokeWeight: 0,
    scale: 8
  };

  const defaultCenter = {
    lat: 52.3676,
    lng: 4.9041
  };

  const mapContainerStyle = {
    width: '100%',
    height: '100%'
  };

  const fetchBikeData = useCallback(async () => {
    try {
      const [bikeResponse, locationsResponse, reportResponse, notesResponse, bikebustersLocationsResponse] = await Promise.all([
        api.get(`/bikes/${bikeId}`),
        api.get(`/bikes/${bikeId}/locations`),
        api.get(`/bikes/${bikeId}/missing-report`),
        api.get(`/bikes/${bikeId}/notes`),
        api.get('/bikebusterslocations')
      ]);
      setBike(bikeResponse.data);
      setLocations(locationsResponse.data);
      setMissingReport(reportResponse.data);
      setNotes(notesResponse.data);
      setBikebustersLocations(bikebustersLocationsResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bike data:', err);
      setError('Failed to load bike data. Please try again.');
      setLoading(false);
    }
  }, [bikeId]);

  useEffect(() => {
    fetchBikeData();
  }, [fetchBikeData]);

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
      await api.post(`/bikes/${bikeId}/found`, { bikebustersLocationId: selectedLocation });
      setBike({ ...bike, reportStatus: 'resolved' });
      setShowFoundPopup(false);
      // Show success message
    } catch (error) {
      console.error('Error marking bike as found:', error);
      setError('Failed to mark bike as found. Please try again.');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-500 mt-8">
      <AlertTriangle className="mx-auto mb-4" size={48} />
      <p>{error}</p>
    </div>
  );

  if (!bike) return (
    <div className="text-center text-gray-500 mt-8">
      <AlertTriangle className="mx-auto mb-4" size={48} />
      <p>Bike not found</p>
    </div>
  );

  const mapCenter = locations.length > 0
    ? { lat: locations[0].location.coordinates[1], lng: locations[0].location.coordinates[0] }
    : defaultCenter;

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

      {bike.reportStatus !== 'resolved' && (
        <Button onClick={handleFoundClick} className="mb-8">
          <Check className="mr-2" size={20} />
          Mark as Found
        </Button>
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
              <div className="flex justify-end space-x-2 mt-4">
                <Button onClick={handleFoundSubmit} disabled={!selectedLocation}>Confirm</Button>
                <Button onClick={() => setShowFoundPopup(false)} variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="map" className="mb-8">
        <TabsList>
          <TabsTrigger value="map">
            <MapPin className="mr-2" size={20} />
            Location History
          </TabsTrigger>
          <TabsTrigger value="data">
            <FileText className="mr-2" size={20} />
            Location Data
          </TabsTrigger>
          <TabsTrigger value="notes">
            <MessageSquare className="mr-2" size={20} />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardContent className="p-0">
              <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={12}
                >
                  {locations.map((location, index) => (
                    <Marker
                      key={index}
                      position={{
                        lat: location.location.coordinates[1],
                        lng: location.location.coordinates[0]
                      }}
                      icon={{...customIcon, fillColor: index === 0 ? "blue" : "red"}}
                    />
                  ))}
                  <Polyline
                    path={locations.map(location => ({
                      lat: location.location.coordinates[1],
                      lng: location.location.coordinates[0]
                    }))}
                    options={{
                      strokeColor: "#4285F4",
                      strokeOpacity: 1,
                      strokeWeight: 2,
                    }}
                  />
                </GoogleMap>
              </LoadScript>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardContent>
              <ul className="space-y-2">
                {locations.map((location, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{new Date(location.timestamp).toLocaleString()}</span>
                    <span>Lat: {location.location.coordinates[1].toFixed(6)}, Lng: {location.location.coordinates[0].toFixed(6)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent>
              <ul className="space-y-4 mb-4">
                {notes.map((note, index) => (
                  <li key={index} className="bg-gray-100 p-3 rounded">
                    <p className="mb-1">{note.content}</p>
                    <p className="text-sm text-gray-500">{new Date(note.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
              <Separator className="my-4" />
              <div className="space-y-4">
                <Label htmlFor="newNote">Add a new note</Label>
                <Input
                  id="newNote"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type your note here..."
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default BikePage;