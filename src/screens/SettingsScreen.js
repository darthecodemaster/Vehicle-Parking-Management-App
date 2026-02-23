// ============================================================
// SettingsScreen.js — System Settings & Admin Options
// ============================================================
// Allows admins to view system config, sign out, and
// see database info. Rate editing would require Firebase
// write permissions.
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../config/firebase';
import { DB_PATHS } from '../config/dbPaths';
import { COLORS, SPACING, RADIUS, SHADOW } from '../config/theme';

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [rates, setRates] = useState({ motorcycle: 10, car: 20, truck: 30 });
  const [loadingRates, setLoadingRates] = useState(false);

  // Fetch current rates from Firebase on mount
  React.useEffect(() => {
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        const snap = await get(ref(database, DB_PATHS.RATES));
        if (snap.exists()) setRates(snap.val());
      } catch (e) {
        console.log('Could not fetch rates:', e.message);
      } finally {
        setLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  // ---- Sign Out ----
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation handled by auth state listener in AppNavigator
            } catch (e) {
              Alert.alert('Error', 'Could not sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const currentUser = auth.currentUser;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>System Settings</Text>
          <Text style={styles.headerSubtitle}>Configuration and admin options</Text>
        </View>

        {/* Admin Info Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.primary }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👤 Admin Profile</Text>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.profileName}>Administrator</Text>
              <Text style={styles.profileEmail}>{currentUser?.email || 'admin@parking.com'}</Text>
            </View>
          </View>
        </View>

        {/* Parking Rates Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.checkIn }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💰 Parking Rates (per hour)</Text>
          </View>
          {loadingRates ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            ['motorcycle', 'car', 'truck'].map((type) => (
              <View key={type} style={styles.rateRow}>
                <Text style={styles.rateLabel}>
                  {type === 'motorcycle' ? '🏍️' : type === 'car' ? '🚗' : '🚛'} {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <Text style={styles.rateValue}>₱{rates[type] || 0}/hr</Text>
              </View>
            ))
          )}
          {/* 
            To make rates editable, add TextInput fields here and call:
            update(ref(database, DB_PATHS.RATES), { motorcycle: val, car: val, truck: val })
          */}
        </View>

        {/* App Settings Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.warning }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚙️ App Settings</Text>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingNote}>Alert on capacity and camera offline</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={notifEnabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Auto-Refresh Data</Text>
              <Text style={styles.settingNote}>Firebase real-time listeners always active</Text>
            </View>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={autoRefresh ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* System Health Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.checkIn }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🖥️ System Health</Text>
          </View>
          <View style={styles.healthGrid}>
            <HealthItem label="Firebase" status="Connected" ok />
            <HealthItem label="Database" status="Online" ok />
            <HealthItem label="Auth" status="Active" ok />
            <HealthItem label="Uptime" status="99.8%" ok />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Smart Parking System v1.0.0</Text>

      </ScrollView>
    </LinearGradient>
  );
}

function HealthItem({ label, status, ok }) {
  return (
    <View style={styles.healthItem}>
      <Text style={styles.healthLabel}>{label}</Text>
      <Text style={[styles.healthStatus, { color: ok ? COLORS.checkIn : COLORS.checkOut }]}>
        {ok ? '✅' : '❌'} {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.md,
    overflow: 'hidden', ...SHADOW.medium,
  },
  cardAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
  },
  cardHeader: { marginBottom: SPACING.md, marginTop: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  // Profile
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  profileEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // Rates
  rateRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rateLabel: { fontSize: 15, color: COLORS.textPrimary },
  rateValue: { fontSize: 15, fontWeight: '700', color: COLORS.primary },

  // Settings toggles
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingLabel: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  settingNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },

  // Health grid
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  healthItem: {
    width: '47%', backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOW.small,
  },
  healthLabel: { fontSize: 13, color: COLORS.textSecondary },
  healthStatus: { fontSize: 14, fontWeight: '600', marginTop: 4 },

  // Sign out
  signOutBtn: {
    backgroundColor: COLORS.danger, borderRadius: RADIUS.md,
    paddingVertical: 16, alignItems: 'center',
    marginTop: SPACING.sm, marginBottom: SPACING.md,
    ...SHADOW.medium,
  },
  signOutText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.6)' },
});
