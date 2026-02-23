// ============================================================
// firebase.js — Firebase Configuration
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a project named "SmartParkingSystem"
// 3. Enable Realtime Database (test mode for development)
// 4. Enable Authentication → Email/Password sign-in method
// 5. Go to Project Settings → General → Your apps → Add app (Web)
// 6. Copy the firebaseConfig object below and replace with your values
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// ⚠️ REPLACE THESE VALUES WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",                          // From Firebase Console
  authDomain: "your-project-id.firebaseapp.com",       // From Firebase Console
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com", // Realtime DB URL
  projectId: "your-project-id",                        // From Firebase Console
  storageBucket: "your-project-id.appspot.com",        // From Firebase Console
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",       // From Firebase Console
  appId: "YOUR_APP_ID",                                // From Firebase Console
};

// Initialize Firebase only once (prevents re-initialization errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export the services used throughout the app
export const database = getDatabase(app);  // Realtime Database
export const auth = getAuth(app);          // Authentication

export default app;
