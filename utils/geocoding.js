const GOOGLE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ===== Simple Cache =====
const cache = new Map();

async function getLatLonFromAddress(address) {
  if (!address || typeof address !== 'string') {
    throw new Error('Valid address is required');
  }

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not set in environment variables');
  }

  const normalizedAddress = address.trim().toLowerCase();

  // Return from cache
  if (cache.has(normalizedAddress)) {
    return cache.get(normalizedAddress);
  }

  const url = `${GOOGLE_BASE_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000
    });

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Geocoding failed: ${data.status}`);
    }

    const result = data.results[0];

    const locationData = {
      lat: result.geometry.location.lat,
      lon: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };

    cache.set(normalizedAddress, locationData);

    return locationData;

  } catch (error) {
    console.error('Google Geocoding Error:', error.message);
    throw new Error('Failed to fetch geolocation');
  }
}

module.exports = {
  getLatLonFromAddress
};
