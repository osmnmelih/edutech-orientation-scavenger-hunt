import { useCallback, useEffect, useRef, useState } from 'react';

export function useGpsWatcher() {
  const [userPos, setUserPos] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const watchId = useRef(null);
  const lastPosRef = useRef(null);
  const lastTimeRef = useRef(0);
  const safetyTimerRef = useRef(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  // Set exact user position directly from device geolocation
  const updateValidatedPosition = useCallback((rawLat, rawLng, accuracy = 0) => {
    console.log(`Real device location acquired: ${rawLat}, ${rawLng} (acc: ${accuracy}m)`);
    setUserPos({ lat: rawLat, lng: rawLng });
    setGpsError('');
  }, []);

  // Force real GPS lookup immediately
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    clearSafetyTimer();

    safetyTimerRef.current = setTimeout(() => {
      setIsLocating(false);
    }, 3500);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearSafetyTimer();
        updateValidatedPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        setIsLocating(false);
      },
      err => {
        console.warn("High-accuracy GPS attempt failed, trying WiFi/cellular lookup...", err);
        navigator.geolocation.getCurrentPosition(
          pos => {
            clearSafetyTimer();
            updateValidatedPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            setIsLocating(false);
          },
          err2 => {
            clearSafetyTimer();
            console.warn("GPS lookup error:", err2);
            setIsLocating(false);
            if (err2.code === 1) {
              setGpsError('Location permission denied in browser.');
            } else {
              setGpsError('GPS signal unavailable.');
            }
          },
          { enableHighAccuracy: false, timeout: 3500, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
    );
  }, [updateValidatedPosition]);

  const startGPS = useCallback(() => {
    locateUser();

    if (!navigator.geolocation) return;

    const successHandler = pos => {
      clearSafetyTimer();
      setIsLocating(false);

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const now = Date.now();

      if (lastPosRef.current) {
        const dLat = lat - lastPosRef.current.lat;
        const dLng = lng - lastPosRef.current.lng;
        const distSq = (dLat * dLat + dLng * dLng) * 1.23e10;
        const timePassed = now - lastTimeRef.current;

        if (distSq < 1.0 && timePassed < 2000) {
          return;
        }
      }

      lastPosRef.current = { lat, lng };
      lastTimeRef.current = now;
      updateValidatedPosition(lat, lng, pos.coords.accuracy);
    };

    const errorHandler = err => {
      clearSafetyTimer();
      setIsLocating(false);
      console.warn("watchPosition error:", err);
    };

    watchId.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [locateUser, updateValidatedPosition]);

  const stopGPS = useCallback(() => {
    clearSafetyTimer();
    setIsLocating(false);
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    lastPosRef.current = null;
    lastTimeRef.current = 0;
  }, []);

  useEffect(() => {
    startGPS();
    return () => stopGPS();
  }, [startGPS, stopGPS]);

  return { userPos, setUserPos, gpsError, isLocating, locateUser, startGPS, stopGPS };
}
