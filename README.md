# Smart Parking System - React Native Mobile App

A real-time parking management mobile app built with React Native + Expo, integrated with Firebase and ESP32-CAMs for live monitoring.

## 📱 Features

- **Live Dashboard** - Real-time parking slot occupancy grid with vehicle counts
- **CCTV Monitoring** - Live MJPEG streams from ESP32-CAMs
- **Security Alerts** - Real-time notifications for unauthorized access and parking events
- **Admin Controls** - Parking rate management, system health monitoring
- **Firebase Authentication** - Secure admin access with persistent sessions

## 🛠 Tech Stack

- **Frontend**: React Native + Expo (JavaScript)
- **Backend**: Firebase (Realtime Database + Authentication)
- **Camera Streams**: MJPEG via WebView (ESP32-CAM)
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **Styling**: StyleSheet with theme-based design

## 📋 Prerequisites

- Node.js LTS
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device
- Firebase account
- (Optional) Android Studio for emulator testing

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd SmartParkingApp
   npm install
   ```

2. **Install dependencies**
   ```bash
   npm install firebase @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
   npm install react-native-screens react-native-safe-area-context react-native-gesture-handler
   npm install react-native-webview
   npx expo install expo-linear-gradient
   ```

3. **Firebase Setup**
   - Create project at [Firebase Console](https://console.firebase.google.com)
   - Enable Email/Password authentication
   - Create Realtime Database (start in test mode)
   - Add admin user: `admin@parking.com`
   - Copy Firebase config to `src/config/firebase.js`

4. **Run the app**
   ```bash
   npx expo start
   ```
   Scan QR code with Expo Go app

## 📁 Project Structure

```
SmartParkingApp/
├── App.js
├── src/
│   ├── config/
│   │   ├── firebase.js      # Firebase configuration
│   │   ├── theme.js          # Global styles & colors
│   │   └── dbPaths.js        # Firebase database paths
│   ├── hooks/
│   │   └── useFirebase.js    # Custom Firebase hooks
│   ├── navigation/
│   │   └── AppNavigator.js   # Auth & tab navigation
│   └── screens/
│       ├── LoginScreen.js
│       ├── DashboardScreen.js
│       ├── CCTVScreen.js
│       ├── SecurityScreen.js
│       └── SettingsScreen.js
```

## 🔧 Configuration

### Firebase Database Structure
```json
{
  "slots": { "slot_1": "available", "slot_2": "occupied" },
  "cameras": { 
    "cam_1": { 
      "name": "Entrance", 
      "stream_url": "http://<ESP32-IP>:81/stream" 
    }
  },
  "alerts": {
    "security": [],
    "system": []
  },
  "settings": { "rates": { "car": 30, "motorcycle": 15 } }
}
```

### Important Notes
- **Camera Streams**: Phone must be on same WiFi network as ESP32-CAM
- **Security**: Never commit real Firebase credentials. Use environment variables for production
- **Database Rules**: Update to authenticated-only before deployment

## 🚢 Production Build

1. Install EAS CLI: `npm install -g eas-cli`
2. Configure: `eas build:configure`
3. Build APK: `eas build --platform android --profile preview`

## 🔐 Security Rules

Update Firebase Realtime Database rules:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Login** | Firebase email/password authentication |
| **Dashboard** | Live slot grid + vehicle statistics |
| **CCTV** | Multi-camera MJPEG streams |
| **Security** | Real-time alerts & access logs |
| **Settings** | Rates, profile, sign-out |

## ⚠️ Common Issues

- **Blank CCTV**: Ensure device and ESP32 are on same WiFi
- **Login fails**: Add user in Firebase Authentication
- **No data**: Import JSON structure to Firebase first
- **White screen**: Verify expo-linear-gradient is installed

## 📄 License

MIT

---

**Built with React Native + Expo**
