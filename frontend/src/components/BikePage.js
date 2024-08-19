import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
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
    path: "M-1.547 12l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM0 0q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
    fillColor: "red",
    fillOpacity: 0.8,
    strokeWeight: 0,
    rotation: 0,
    scale: 1,
  };

  const defaultCenter = {
    lat: 52.3676,
    lng: 4.9041
  };

  useEffect(() => {
    const fetchBikeData = async () => {
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

  const handleBackClick = () => {
    navigate('/');  // Navigate back to the main page
  };

  const handleFoundClick = () => {
    setShowFoundPopup(true);
  };

  const handleFoundSubmit = async () => {
    try {
      const response = await api.post(`/bikes/${bikeId}/found`, { bikebustersLocationId: selectedLocation });
      setBike({ ...bike, reportStatus: 'resolved' });
      setShowFoundPopup(false);
      // You might want to show a success message here
    } catch (error) {
      console.error('Error marking bike as found:', error);
      setError('Failed to mark bike as found. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!bike) return <div>Bike not found</div>;

    const mapCenter = locations.length > 0
    ? { lat: locations[0].location.coordinates[1], lng: locations[0].location.coordinates[0] }
    : defaultCenter;
    const mapContainerStyle = {
      width: '100%',
      height: '400px'
    };

    return (
      <div>
      <button onClick={handleBackClick}>Back to All Bikes</button>
      <h1>{bike.make} {bike.model}</h1>
      <p>Serial Number: {bike.serialNumber}</p>
      <p>Status: {bike.reportStatus}</p>
      <p>Last Signal: {bike.lastSignal ? new Date(bike.lastSignal).toLocaleString() : 'N/A'}</p>

      {missingReport && (
        <div>
          <h2>Missing Report</h2>
          <p>Last Seen: {new Date(missingReport.lastSeenOn).toLocaleString()}</p>
          <p>Reported Missing: {new Date(missingReport.missingSince).toLocaleString()}</p>

          <p>Member Email: {missingReport.memberEmail}</p>
        </div>
      )}

      {bike.reportStatus !== 'resolved' && (
        <button onClick={handleFoundClick}>Mark as Found</button>
      )}

      {showFoundPopup && (
        <div className="popup">
          <h2>Where will the bike be returned?</h2>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">Select a location</option>
            {bikebustersLocations.map(location => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
          <button onClick={handleFoundSubmit}>Confirm</button>
          <button onClick={() => setShowFoundPopup(false)}>Cancel</button>
        </div>
      )}

      <h2>Location History</h2>
      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={12}
        >
        <Marker
          position={defaultCenter}
          title="Test Marker"
          icon={{...customIcon, fillColor: "blue"}}
        />
      {locations.map((location, index) => (
        <Marker
          key={index}
          position={{
            lat: location.location.coordinates[1],
            lng: location.location.coordinates[0]
          }}
          label={(index + 1).toString()}
        />
        ))}
        <Polyline
        path={locations.map(location => ({
          lat: location.location.coordinates[1],
          lng: location.location.coordinates[0]
        }))}
        options={{
          strokeColor: "#FF0000",
          strokeOpacity: 1,
          strokeWeight: 2,
        }}
        />
        </GoogleMap>
      </LoadScript>

      <h2>Location Data</h2>
      <ul>
        {locations.map((location, index) => (
          <li key={index}>
            Timestamp: {new Date(location.timestamp).toLocaleString()}, 
            Lat: {location.location.coordinates[1]}, 
            Lng: {location.location.coordinates[0]}
          </li>
        ))}
      </ul>

      <h2>Notes</h2>
      <ul>
        {notes.map((note, index) => (
          <li key={index}>{note.content} - {new Date(note.createdAt).toLocaleString()}</li>
        ))}
      </ul>
      <textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder="Add a new note"
      />
      <button onClick={handleAddNote}>Add Note</button>
    </div>
  );
};

export default BikePage;