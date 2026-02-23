// ============================================================
// AppNavigator.js — App Navigation & Auth State Handler
// ============================================================
// Listens to Firebase Auth state changes.
// If user is logged in → show main tab navigator
// If user is logged out → show login screen
// This pattern ensures the app reacts automatically to
// signIn() and signOut() calls from anywhere in the app.
// ============================================================

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { COLORS } from '../config/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CCTVScreen from '../screens/CCTVScreen';
import SecurityScreen from '../screens/SecurityScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ---- Bottom Tab Icons (emoji — replace with react-native-vector-icons) ----
const TAB_ICONS = {
  Dashboard: '📊',
  CCTV: '📷',
  Security: '🛡️',
  Settings: '⚙️',
};

// ---- Main Tab Navigator (shown when logged in) ----
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Management' }} />
      <Tab.Screen name="CCTV" component={CCTVScreen} options={{ title: 'CCTV' }} />
      <Tab.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

// ---- Root Navigator ----
export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Show splash/loading while Firebase checks auth state
  if (initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>🅿️</Text>
        <Text style={styles.splashTitle}>Smart Parking</Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated — show main app
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          // Not authenticated — show login
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gradientStart,
  },
  splashIcon: { fontSize: 64 },
  splashTitle: {
    fontSize: 24, fontWeight: '700',
    color: COLORS.white, marginTop: 12,
  },
});
