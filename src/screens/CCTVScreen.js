// ============================================================
// CCTVScreen.js — Live Camera Stream Viewer
// ============================================================
// Displays real-time MJPEG streams from ESP32-CAM modules.
// ESP32-CAM must be on the SAME WiFi network as the device,
// OR you must expose the stream via a public tunnel (ngrok).
//
// ESP32 serves the stream at: http://<IP>:81/stream
// That URL is stored in Firebase: cameras/<id>/stream_url
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useCameras } from '../hooks/useFirebase';
import { COLORS, SPACING, RADIUS, SHADOW } from '../config/theme';

export default function CCTVScreen() {
  const { cameras, loading } = useCameras();
  const [selectedCam, setSelectedCam] = useState(null);
  const [streamError, setStreamError] = useState(false);

  const cameraList = Object.entries(cameras);

  // Auto-select first online camera
  React.useEffect(() => {
    if (!selectedCam && cameraList.length > 0) {
      const firstOnline = cameraList.find(([, cam]) => cam.status === 'online');
      if (firstOnline) setSelectedCam(firstOnline[0]);
    }
  }, [cameras]);

  const selectedCamData = selectedCam ? cameras[selectedCam] : null;
  const streamUrl = selectedCamData?.stream_url || '';

  // ---- Inline HTML that loads MJPEG stream in an <img> tag ----
  // WebView is used because React Native's Image component does not
  // support MJPEG streams natively.
  const streamHtml = streamUrl
    ? `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh; }
          img { width:100%; max-height:100vh; object-fit:contain; }
          .err { color:#fff; font-family:sans-serif; text-align:center; padding:20px; }
        </style>
      </head><body>
        <img src="${streamUrl}" 
             onerror="document.body.innerHTML='<div class=\\'err\\'>⚠️ Stream unavailable<br><small>${streamUrl}</small></div>'"
        />
      </body></html>`
    : '';

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]} style={styles.gradient}>

      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CCTV Monitoring</Text>
        <Text style={styles.headerSubtitle}>
          {cameraList.filter(([, c]) => c.status === 'online').length} / {cameraList.length} online
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      ) : (
        <View style={styles.content}>

          {/* ---- Live Stream Viewer ---- */}
          <View style={styles.streamCard}>
            {selectedCam && streamUrl ? (
              <>
                <View style={styles.streamHeader}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.streamLabel}>
                    {selectedCam.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>

                {/* 
                  WebView loads the MJPEG stream HTML.
                  The ESP32 streams at http://<IP>:81/stream
                  Store that URL in Firebase cameras/<id>/stream_url
                */}
                <WebView
                  source={{ html: streamHtml }}
                  style={styles.webview}
                  scrollEnabled={false}
                  bounces={false}
                  onError={() => setStreamError(true)}
                  javaScriptEnabled={true}
                  mixedContentMode="always"  // Required for HTTP streams on Android
                />
              </>
            ) : (
              <View style={styles.noStream}>
                <Text style={styles.noStreamIcon}>📷</Text>
                <Text style={styles.noStreamText}>
                  {cameraList.length === 0
                    ? 'No cameras configured in Firebase'
                    : 'Select a camera below to view stream'}
                </Text>
                <Text style={styles.noStreamNote}>
                  Stream URL format: http://192.168.x.x:81/stream
                </Text>
              </View>
            )}
          </View>

          {/* ---- Camera Selector List ---- */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.camListScroll}>
            {cameraList.map(([camId, cam]) => (
              <TouchableOpacity
                key={camId}
                style={[
                  styles.camChip,
                  selectedCam === camId && styles.camChipActive,
                  cam.status !== 'online' && styles.camChipOffline,
                ]}
                onPress={() => {
                  setSelectedCam(camId);
                  setStreamError(false);
                }}
                disabled={cam.status !== 'online'}
              >
                <View style={[
                  styles.camStatusDot,
                  { backgroundColor: cam.status === 'online' ? COLORS.checkIn : COLORS.checkOut }
                ]} />
                <Text style={[
                  styles.camChipText,
                  selectedCam === camId && styles.camChipTextActive,
                ]}>
                  {camId.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ---- Camera Status Cards ---- */}
          <View style={styles.statusGrid}>
            {cameraList.map(([camId, cam]) => (
              <CameraStatusCard
                key={camId}
                camId={camId}
                cam={cam}
                isSelected={selectedCam === camId}
                onSelect={() => { setSelectedCam(camId); setStreamError(false); }}
              />
            ))}
          </View>

          {/* ---- Stats Row ---- */}
          <View style={styles.statsCard}>
            <StatItem
              label="Online"
              value={cameraList.filter(([, c]) => c.status === 'online').length}
              color={COLORS.checkIn}
            />
            <StatItem
              label="Offline"
              value={cameraList.filter(([, c]) => c.status !== 'online').length}
              color={COLORS.checkOut}
            />
            <StatItem
              label="Total"
              value={cameraList.length}
              color={COLORS.primary}
            />
          </View>

        </View>
      )}
    </LinearGradient>
  );
}

function CameraStatusCard({ camId, cam, isSelected, onSelect }) {
  const isOnline = cam.status === 'online';

  // Format last heartbeat timestamp
  const heartbeat = cam.last_heartbeat
    ? new Date(cam.last_heartbeat).toLocaleTimeString()
    : 'Never';

  return (
    <TouchableOpacity
      style={[styles.camCard, isSelected && styles.camCardSelected]}
      onPress={onSelect}
      disabled={!isOnline}
    >
      <View style={styles.camCardRow}>
        <View style={[styles.camDot, { backgroundColor: isOnline ? COLORS.checkIn : COLORS.checkOut }]} />
        <Text style={styles.camCardTitle}>{camId.replace(/_/g, ' ')}</Text>
      </View>
      <Text style={styles.camCardStatus}>
        {isOnline ? '● Online' : '● Offline'}
      </Text>
      <Text style={styles.camCardTime}>Last seen: {heartbeat}</Text>
    </TouchableOpacity>
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  content: { flex: 1, padding: SPACING.md },

  // Stream viewer
  streamCard: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    height: 220,
    marginBottom: SPACING.md,
    ...SHADOW.large,
  },
  streamHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.sm, gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.checkOut,
  },
  liveText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  streamLabel: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  webview: { flex: 1 },
  noStream: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  noStreamIcon: { fontSize: 40, marginBottom: SPACING.sm },
  noStreamText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  noStreamNote: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Camera selector chips
  camListScroll: { marginBottom: SPACING.md },
  camChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: SPACING.sm, gap: 6,
  },
  camChipActive: { backgroundColor: COLORS.white },
  camChipOffline: { opacity: 0.5 },
  camStatusDot: { width: 8, height: 8, borderRadius: 4 },
  camChipText: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  camChipTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Status cards
  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md,
  },
  camCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, width: '47%',
    ...SHADOW.small,
  },
  camCardSelected: { borderWidth: 2, borderColor: COLORS.primary },
  camCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  camDot: { width: 10, height: 10, borderRadius: 5 },
  camCardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  camCardStatus: { fontSize: 12, color: COLORS.textSecondary },
  camCardTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Stats footer
  statsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.md, flexDirection: 'row',
    justifyContent: 'space-around', ...SHADOW.small,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
