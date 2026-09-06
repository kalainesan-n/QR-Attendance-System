/**
 * Haversine formula — calculates the great-circle distance between two
 * points on Earth given their latitude and longitude in decimal degrees.
 *
 * Plain English: Earth is a sphere. Two GPS coordinates are points on that
 * sphere. This formula uses a bit of trigonometry to calculate the straight-
 * line (as-the-crow-flies) distance between them, accounting for the
 * curvature of the Earth. The result is in meters.
 *
 * @param {number} lat1  Latitude of point 1
 * @param {number} lon1  Longitude of point 1
 * @param {number} lat2  Latitude of point 2
 * @param {number} lon2  Longitude of point 2
 * @returns {number}     Distance in meters
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters

  // Convert degrees to radians
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

module.exports = { haversine };
