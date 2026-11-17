import { uiCopy } from '../constants/uiCopy.js';

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(uiCopy.permissions.geolocationUnsupported));
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, measuredAt: new Date(timestamp).toISOString(), source: 'device' }),
      ({ code }) => reject(new Error(code === 1 ? uiCopy.permissions.geolocationDenied : uiCopy.permissions.geolocationUnavailable)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
