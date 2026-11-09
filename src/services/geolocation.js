export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Tu navegador no admite ubicación.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, measuredAt: new Date(timestamp).toISOString(), source: 'device' }),
      ({ code }) => reject(new Error(code === 1 ? 'Permite el acceso a tu ubicación para publicar.' : 'No se pudo obtener la ubicación. Activa el GPS e inténtalo de nuevo.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
