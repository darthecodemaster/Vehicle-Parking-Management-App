// ============================================================
// useFirebase.js — Custom Hooks for Firebase Realtime Data
// ============================================================
// These hooks subscribe to Firebase paths and return live data.
// Components using these hooks auto-update when data changes.
// ============================================================

import { useState, useEffect } from 'react';
import { ref, onValue, off, set, update, get } from 'firebase/database';
import { database } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths';

// ---- Hook: All parking spots (real-time) ----
export function useParkingSpots() {
  const [spots, setSpots] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const spotsRef = ref(database, DB_PATHS.PARKING_SPOTS);

    const unsubscribe = onValue(
      spotsRef,
      (snapshot) => {
        setSpots(snapshot.val() || {});
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener when component unmounts
    return () => off(spotsRef);
  }, []);

  return { spots, loading, error };
}

// ---- Hook: Check-in and check-out counts (real-time) ----
export function useVehicleCounts() {
  const [checkIn, setCheckIn] = useState({ motorcycle: 0, car: 0, truck: 0 });
  const [checkOut, setCheckOut] = useState({ motorcycle: 0, car: 0, truck: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const inRef = ref(database, DB_PATHS.CHECKIN_COUNT);
    const outRef = ref(database, DB_PATHS.CHECKOUT_COUNT);

    const unsubIn = onValue(inRef, (snap) => {
      setCheckIn(snap.val() || { motorcycle: 0, car: 0, truck: 0 });
      setLoading(false);
    });

    const unsubOut = onValue(outRef, (snap) => {
      setCheckOut(snap.val() || { motorcycle: 0, car: 0, truck: 0 });
    });

    return () => {
      off(inRef);
      off(outRef);
    };
  }, []);

  return { checkIn, checkOut, loading };
}

// ---- Hook: Camera statuses and stream URLs (real-time) ----
export function useCameras() {
  const [cameras, setCameras] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const camRef = ref(database, DB_PATHS.CAMERAS);

    const unsubscribe = onValue(camRef, (snap) => {
      setCameras(snap.val() || {});
      setLoading(false);
    });

    return () => off(camRef);
  }, []);

  return { cameras, loading };
}

// ---- Hook: Alerts (real-time) ----
export function useAlerts() {
  const [alerts, setAlerts] = useState({ full_capacity: [], camera_offline: [], unauthorized: [] });

  useEffect(() => {
    const alertRef = ref(database, DB_PATHS.ALERTS);

    const unsubscribe = onValue(alertRef, (snap) => {
      setAlerts(snap.val() || { full_capacity: [], camera_offline: [], unauthorized: [] });
    });

    return () => off(alertRef);
  }, []);

  return { alerts };
}

// ---- Utility: Compute available slot counts from spots data ----
export function computeAvailableCounts(spots) {
  const counts = { motorcycle: 0, car: 0, truck: 0 };
  Object.values(spots).forEach((slot) => {
    if (!slot.occupied && slot.type) {
      counts[slot.type] = (counts[slot.type] || 0) + 1;
    }
  });
  return counts;
}

// ---- Utility: Manually update a slot (for admin overrides) ----
export async function updateSlot(slotId, data) {
  const slotRef = ref(database, DB_PATHS.SLOT(slotId));
  return update(slotRef, data);
}

// ---- Utility: Clear a slot (admin action) ----
export async function clearSlot(slotId) {
  const slotRef = ref(database, DB_PATHS.SLOT(slotId));
  return update(slotRef, {
    occupied: false,
    vehicle_type: '',
    license_plate: '',
    entry_time: 0,
  });
}
