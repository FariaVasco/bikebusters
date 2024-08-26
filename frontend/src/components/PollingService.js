import React, { useEffect, useCallback } from 'react';
import api from '../services/api';

const PollingService = ({ onUpdateReceived }) => {
  const pollUpdates = useCallback(async () => {
    try {
      const response = await api.get('/api/bikes/check-updates');
      if (response.data && response.data.updatedBikes) {
        onUpdateReceived(response.data.updatedBikes);
      }
    } catch (error) {
      console.error('Error polling updates:', error);
    }
  }, [onUpdateReceived]);

  useEffect(() => {
    const intervalId = setInterval(pollUpdates, 0.5 * 60 * 1000); // Poll every 4 minutes

    return () => clearInterval(intervalId);
  }, [pollUpdates]);

  return null;
};

export default PollingService;