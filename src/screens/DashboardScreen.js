// ============================================================
// DashboardScreen.js — Vehicle Management Dashboard
// ============================================================
// Main screen showing live vehicle counts per type and
// a slot-by-slot occupancy grid. All data comes from Firebase
// in real time via custom hooks.
// ============================================================

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useParkingSpots, useVehicleCounts, computeAvailableCounts, clearSlot } from '../hooks/useFirebase';
import { COLORS, SPACING, RADIUS, SHADOW } from '../config/theme';

// ---- Vehicle type icons (emoji fallback — replace with react-native-vector-icons if desired) ----
const VEHICLE_ICONS = { motorcycle: '🏍️', car: '🚗', truck: '🚛' };

export default function DashboardScreen() {
  const { spots, loading: spotsLoading } = useParkingSpots();
  const { checkIn, checkOut, loading: countsLoading } = useVehicleCounts();
  const [refreshing, setRefreshing] = React.useState(false);

  // Derive available counts from live spot data
  const available = useMemo(() => computeAvailableCounts(spots), [spots]);

  const loading = spotsLoading || countsLoading;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Firebase onValue listeners keep data fresh automatically;
    // this just triggers a visual refresh indicator
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.white} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
      >

        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vehicle Dashboard</Text>
          <Text style={styles.headerSubtitle}>Live parking status</Text>
        </View>

        {/* Vehicle Type Cards */}
        {['motorcycle', 'car', 'truck'].map((type) => (
          <VehicleCard
            key={type}
            type={type}
            icon={VEHICLE_ICONS[type]}
            checkIn={checkIn[type] || 0}
            checkOut={checkOut[type] || 0}
            available={available[type] || 0}
          />
        ))}

        {/* Slot Grid */}
        <SlotGrid spots={spots} />

      </ScrollView>
    </LinearGradient>
  );
}

// ---- Vehicle Summary Card ----
function VehicleCard({ type, icon, checkIn, checkOut, available }) {
  return (
    <View style={styles.card}>
      {/* Card top accent bar */}
      <View style={styles.cardAccentBar} />

      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.cardTitle}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatItem label="Check In" value={checkIn} color={COLORS.checkIn} />
        <StatItem label="Check Out" value={checkOut} color={COLORS.checkOut} />
        <StatItem label="Available" value={available} color={COLORS.primary} />
      </View>
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

// ---- Parking Slot Grid ----
function SlotGrid({ spots }) {
  const slotEntries = Object.entries(spots);

  if (slotEntries.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>No slots configured yet.</Text>
        <Text style={styles.emptySubText}>Import the database JSON in Firebase Console.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.slotGridTitle}>Slot Overview</Text>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendDot color={COLORS.checkIn} label="Available" />
        <LegendDot color={COLORS.checkOut} label="Occupied" />
        <LegendDot color={COLORS.reserved} label="Reserved" />
      </View>

      {/* Grid */}
      <View style={styles.slotsGrid}>
        {slotEntries.map(([id, slot]) => (
          <SlotTile key={id} slotId={id} slot={slot} />
        ))}
      </View>
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function SlotTile({ slotId, slot }) {
  // Determine style based on occupancy
  const isOccupied = slot.occupied;
  const isReserved = slot.reserved;

  let bgColor = COLORS.slotAvailableBg;
  let borderColor = COLORS.slotAvailableBorder;
  let textColor = COLORS.slotAvailableText;
  let statusLabel = 'Free';

  if (isOccupied) {
    bgColor = COLORS.slotOccupiedBg;
    borderColor = COLORS.slotOccupiedBorder;
    textColor = COLORS.slotOccupiedText;
    statusLabel = 'Taken';
  } else if (isReserved) {
    bgColor = COLORS.slotReservedBg;
    borderColor = COLORS.slotReservedBorder;
    textColor = COLORS.slotReservedText;
    statusLabel = 'Rsvd';
  }

  const slotNum = slotId.replace('slot_', '').toUpperCase();
  const typeLabel = (slot.type || '').charAt(0).toUpperCase();

  return (
    <View style={[styles.slotTile, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.slotId, { color: textColor }]}>{typeLabel}-{slotNum}</Text>
      <Text style={[styles.slotStatus, { color: textColor }]}>{statusLabel}</Text>
      {isOccupied && slot.vehicle_type ? (
        <Text style={styles.slotVehicle}>{VEHICLE_ICONS[slot.vehicle_type] || '🚘'}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.white, marginTop: SPACING.md, fontSize: 16 },
  container: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.medium,
  },
  cardAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.md, marginTop: 4,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  iconBadge: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconText: { fontSize: 24 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },

  // Stats row inside card
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Slot grid
  slotGridTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  legend: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary },
  slotsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  slotTile: {
    width: '30%', minHeight: 72, borderRadius: RADIUS.md,
    borderWidth: 1.5, padding: SPACING.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  slotId: { fontSize: 13, fontWeight: '700' },
  slotStatus: { fontSize: 11, marginTop: 2 },
  slotVehicle: { fontSize: 16, marginTop: 2 },

  // Empty state
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  emptySubText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});
