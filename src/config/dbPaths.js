// ============================================================
// dbPaths.js — Firebase Realtime Database Path Constants
// ============================================================
// Centralizing all Firebase paths prevents typos and makes
// it easy to change the DB structure in one place.
// These paths MUST match the ESP32 firmware paths exactly.
// ============================================================

export const DB_PATHS = {
  // Parking slot data: /parking_spots/slot_0, slot_1, etc.
  PARKING_SPOTS: 'parking_spots',
  SLOT: (id) => `parking_spots/slot_${id}`,

  // Vehicle counts
  CHECKIN_COUNT: 'checkin_count',              // { motorcycle: 0, car: 0, truck: 0 }
  CHECKOUT_COUNT: 'checkout_count',            // { motorcycle: 0, car: 0, truck: 0 }

  // Camera statuses and stream URLs
  CAMERAS: 'cameras',                          // { entrance: {...}, exit: {...}, slot_0: {...} }
  CAMERA: (id) => `cameras/${id}`,

  // Alerts
  ALERTS: 'alerts',
  ALERT_FULL: 'alerts/full_capacity',
  ALERT_OFFLINE: 'alerts/camera_offline',
  ALERT_UNAUTHORIZED: 'alerts/unauthorized',

  // App settings
  SETTINGS: 'settings',
  RATES: 'settings/rates',                     // { motorcycle: 10, car: 20, truck: 30 }
  ADMIN_USERS: 'settings/admin_users',

  // Access logs
  LOGS: 'logs/access',
};

// ============================================================
// FIREBASE DATABASE STRUCTURE (for reference)
// Import this JSON into Firebase Console → Realtime Database
// ============================================================
// {
//   "parking_spots": {
//     "slot_0": { "type": "motorcycle", "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_0" },
//     "slot_1": { "type": "motorcycle", "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_1" },
//     "slot_2": { "type": "car",        "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_2" },
//     "slot_3": { "type": "car",        "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_3" },
//     "slot_4": { "type": "car",        "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_4" },
//     "slot_5": { "type": "truck",      "occupied": false, "vehicle_type": "", "license_plate": "", "entry_time": 0, "camera_id": "slot_cam_5" }
//   },
//   "checkin_count":  { "motorcycle": 0, "car": 0, "truck": 0 },
//   "checkout_count": { "motorcycle": 0, "car": 0, "truck": 0 },
//   "cameras": {
//     "entrance": { "status": "online", "stream_url": "http://192.168.1.101:81/stream", "last_heartbeat": 0 },
//     "exit":     { "status": "online", "stream_url": "http://192.168.1.102:81/stream", "last_heartbeat": 0 },
//     "slot_cam_0": { "status": "online", "stream_url": "http://192.168.1.103:81/stream", "last_heartbeat": 0 }
//   },
//   "alerts": { "full_capacity": [], "camera_offline": [], "unauthorized": [] },
//   "settings": {
//     "rates": { "motorcycle": 10, "car": 20, "truck": 30 },
//     "admin_users": ["admin@parking.com"]
//   }
// }
