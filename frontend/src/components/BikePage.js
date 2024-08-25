import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { Bike, FileText, MessageSquare, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import api from '../services/api';

const libraries = ["places"];
const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const BikePage = () => {
  const { bikeId } = useParams();
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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const fetchBikeData = async () => {
      try {
        setLoading(true);
        const [bikeResponse, missingReportResponse, locationsResponse, notesResponse] = await Promise.all([
          api.get(`/bikes/${bikeId}`),
          api.get(`/bikes/${bikeId}/missing-report`),
          api.get(`/bikes/${bikeId}/locations`),
          api.get(`/bikes/${bikeId}/notes`)
        ]);
        
        setBike(bikeResponse.data);
        setMissingReport(missingReportResponse.data);
        setLocations(locationsResponse.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setNotes(notesResponse.data);
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
    // ... (keep existing handleAddNote function)
  };

  const handleSubmitMissingReport = async (e) => {
    // ... (keep existing handleSubmitMissingReport function)
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
    </div>
  );
};

export default BikePage;