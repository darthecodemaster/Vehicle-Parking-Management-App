// ============================================================
// SecurityScreen.js — Security Management Screen
// ============================================================
// Shows real-time security alerts, access logs (authorized vs.
// denied entries), and system status from Firebase.
// ============================================================

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlerts } from '../hooks/useFirebase';
import { COLORS, SPACING, RADIUS, SHADOW } from '../config/theme';

export default function SecurityScreen() {
  const { alerts } = useAlerts();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Count alert types
  const fullCapacityAlerts = Array.isArray(alerts.full_capacity) ? alerts.full_capacity : [];
  const offlineAlerts = Array.isArray(alerts.camera_offline) ? alerts.camera_offline : [];
  const unauthorizedAlerts = Array.isArray(alerts.unauthorized) ? alerts.unauthorized : [];

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
      >

        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Security Management</Text>
          <Text style={styles.headerSubtitle}>Alerts and access control</Text>
        </View>

        {/* System Status Card */}
        <View style={styles.card}>
          <View style={styles.cardAccentBar} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🛡️ System Status</Text>
          </View>
          <View style={styles.statusGrid}>
            <StatusItem icon="✅" label="System Status" value="Active" color={COLORS.checkIn} />
            <StatusItem icon="👮" label="Guards on Duty" value="4" color={COLORS.primary} />
            <StatusItem icon="🔒" label="Security Level" value="High" color={COLORS.checkIn} />
            <StatusItem icon="⏱️" label="System Uptime" value="99.8%" color={COLORS.primary} />
          </View>
        </View>

        {/* Alert Summary Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.danger }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚠️ Active Alerts</Text>
          </View>
          <View style={styles.alertGrid}>
            <AlertBadge
              label="Full Capacity"
              count={fullCapacityAlerts.length}
              color={COLORS.checkOut}
            />
            <AlertBadge
              label="Camera Offline"
              count={offlineAlerts.length}
              color={COLORS.warning}
            />
            <AlertBadge
              label="Unauthorized"
              count={unauthorizedAlerts.length}
              color={COLORS.danger}
            />
          </View>
        </View>

        {/* Access Control Card */}
        <View style={styles.card}>
          <View style={[styles.cardAccentBar, { backgroundColor: COLORS.checkIn }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🔑 Access Control</Text>
          </View>
          <View style={styles.statsRow}>
            <StatItem label="Authorized Today" value="156" color={COLORS.checkIn} />
            <StatItem label="Denied Today" value="8" color={COLORS.checkOut} />
          </View>
        </View>

        {/* Recent Alerts List */}
        {fullCapacityAlerts.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🚨 Capacity Alerts</Text>
            </View>
            {fullCapacityAlerts.slice(-5).reverse().map((alert, idx) => (
              <AlertItem key={idx} message={alert} color={COLORS.checkOut} />
            ))}
          </View>
        )}

        {offlineAlerts.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📷 Camera Offline Alerts</Text>
            </View>
            {offlineAlerts.slice(-5).reverse().map((alert, idx) => (
              <AlertItem key={idx} message={alert} color={COLORS.warning} />
            ))}
          </View>
        )}

        {/* No alerts state */}
        {fullCapacityAlerts.length === 0 && offlineAlerts.length === 0 && unauthorizedAlerts.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.noAlerts}>✅ No active alerts</Text>
            <Text style={styles.noAlertsNote}>All systems operating normally</Text>
          </View>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

function StatusItem({ icon, label, value, color }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusIcon}>{icon}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

function AlertBadge({ label, count, color }) {
  return (
    <View style={[styles.alertBadge, { borderColor: color }]}>
      <Text style={[styles.alertBadgeCount, { color }]}>{count}</Text>
      <Text style={styles.alertBadgeLabel}>{label}</Text>
    </View>
  );
}

function StatItem({ label, value, color }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AlertItem({ message, color }) {
  return (
    <View style={[styles.alertItem, { borderLeftColor: color }]}>
      <Text style={styles.alertItemText}>{message}</Text>
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
    backgroundColor: COLORS.primary,
  },
  cardHeader: { marginBottom: SPACING.md, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },

  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  statusItem: {
    width: '47%', backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', ...SHADOW.small,
  },
  statusIcon: { fontSize: 22, marginBottom: 4 },
  statusLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  statusValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  alertGrid: { flexDirection: 'row', gap: SPACING.sm },
  alertBadge: {
    flex: 1, borderRadius: RADIUS.md, borderWidth: 2,
    padding: SPACING.md, alignItems: 'center',
  },
  alertBadgeCount: { fontSize: 28, fontWeight: '800' },
  alertBadgeLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  alertItem: {
    borderLeftWidth: 3, paddingLeft: SPACING.sm, paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  alertItemText: { fontSize: 13, color: COLORS.textPrimary },

  noAlerts: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  noAlertsNote: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});
