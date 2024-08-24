// Helper function to calculate time differences in hours
const getHoursDifference = (date1, date2) => {
    return Math.abs(date1 - date2) / (1000 * 60 * 60);
  };
  
  export const prioritizeBikes = (bikes, userLocation) => {
    const now = new Date();
  
    // Helper function to categorize bikes
    const categorizeBike = (bike) => {
      const lastSignal = new Date(bike.lastSignal);
      const hoursDifference = getHoursDifference(now, lastSignal);
      const drivingTimeMinutes = bike.duration ? bike.duration / 60 : Infinity;
  
      if (hoursDifference > 1 && hoursDifference <= 24) {
        return drivingTimeMinutes <= 60 ? 1 : 2;
      } else if (hoursDifference > 24 && hoursDifference <= 72) {
        return drivingTimeMinutes <= 60 ? 2 : 3;
      } else if (hoursDifference <= 1) {
        return drivingTimeMinutes <= 60 ? 3 : 4;
      } else {
        return 4;
      }
    };
  
    // Categorize and sort bikes
    const categorizedBikes = bikes.reduce((acc, bike) => {
      const category = categorizeBike(bike);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(bike);
      return acc;
    }, {});
  
    // Sort bikes within each category by driving time
    Object.keys(categorizedBikes).forEach(category => {
      categorizedBikes[category].sort((a, b) => {
        const aDuration = a.duration || Infinity;
        const bDuration = b.duration || Infinity;
        return aDuration - bDuration;
      });
    });
  
    // Flatten the sorted categories into a single array
    const sortedBikes = [1, 2, 3, 4].flatMap(category => categorizedBikes[category] || []);
  
    return sortedBikes;
  };
  
  export const formatTimeDifference = (date) => {
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };
  
  export const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };