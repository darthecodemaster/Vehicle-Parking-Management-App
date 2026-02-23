// ============================================================
// SmartParking_SlotCamera.ino
// ESP32-CAM — Parking Slot Occupancy Camera
// ============================================================
// FUNCTION: Monitors a specific slot → detects if a vehicle
// is present → updates Firebase occupancy status
//
// Flash one of these per slot camera (or one per 1-2 slots
// if your camera has wide enough FOV).
//
// BOARD: AI-Thinker ESP32-CAM
// ============================================================

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <FirebaseESP32.h>
#include <base64.h>

// ============================================================
// ⚠️ CONFIGURATION — EDIT BEFORE FLASHING EACH SLOT CAMERA
// ============================================================

#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"

// ⚠️ PLUG IN your Roboflow API key and model
#define ROBOFLOW_API_KEY "YOUR_ROBOFLOW_API_KEY"
#define ROBOFLOW_MODEL   "YOUR_MODEL_ID/VERSION"

// ⚠️ Firebase credentials (same as entrance camera)
#define FIREBASE_HOST    "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH    "YOUR_DATABASE_SECRET_OR_LEGACY_TOKEN"

// ⚠️ UNIQUE PER DEVICE — change this for each slot camera
// Must match the slot index in Firebase (slot_0, slot_1, etc.)
#define SLOT_ID          0   // e.g., 0 for slot_0, 1 for slot_1

// Optional: descriptive name for heartbeat logging
#define CAMERA_ID        "slot_cam_0"

// Detection interval: how often to check slot (milliseconds)
// 15 seconds is a good balance of speed vs. API call cost
#define CHECK_INTERVAL_MS 15000

// Confidence threshold
#define CONFIDENCE_THRESHOLD 0.50

// ============================================================
// Camera Pin Definitions — AI-Thinker ESP32-CAM
// ============================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ============================================================
// Global State
// ============================================================
FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

bool previousOccupied = false;  // Track state changes
unsigned long lastCheckTime = 0;
unsigned long lastHeartbeat = 0;

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.printf("\n=== Slot Camera — Slot %d ===\n", SLOT_ID);

  initCamera();
  connectWiFi();
  initFirebase();

  // Load current slot state from Firebase to avoid false transitions on boot
  String path = "parking_spots/slot_" + String(SLOT_ID) + "/occupied";
  if (Firebase.getBool(fbData, path)) {
    previousOccupied = fbData.boolData();
  }

  Serial.printf("✅ Ready. Monitoring slot_%d every %d seconds\n",
                SLOT_ID, CHECK_INTERVAL_MS / 1000);
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Heartbeat every 30 seconds
  if (millis() - lastHeartbeat > 30000) {
    Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/status", "online");
    Firebase.setInt(fbData, String("cameras/") + CAMERA_ID + "/last_heartbeat", (int)(millis() / 1000));
    lastHeartbeat = millis();
  }

  // Wait for check interval
  if (millis() - lastCheckTime < CHECK_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastCheckTime = millis();

  // Capture and detect
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Capture failed");
    delay(500);
    return;
  }

  String response = sendToRoboflow(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  if (response.isEmpty()) return;

  bool nowOccupied = detectVehiclePresence(response);

  // Only update Firebase if occupancy state CHANGED
  // This reduces unnecessary database writes
  if (nowOccupied != previousOccupied) {
    updateSlotOccupancy(nowOccupied);
    previousOccupied = nowOccupied;
  }

  Serial.printf("Slot %d: %s\n", SLOT_ID, nowOccupied ? "OCCUPIED" : "AVAILABLE");
}

// ============================================================
// Camera Initialization
// ============================================================
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM; config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  // QVGA is sufficient for slot monitoring — smaller = faster uploads
  config.frame_size   = FRAMESIZE_QVGA;
  config.jpeg_quality = 20;
  config.fb_count     = 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed — restarting");
    ESP.restart();
  }
  Serial.println("✅ Camera ready");
}

// ============================================================
// WiFi Connection
// ============================================================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 30) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() != WL_CONNECTED) ESP.restart();
  Serial.printf("\n✅ WiFi OK: %s\n", WiFi.localIP().toString().c_str());
}

// ============================================================
// Firebase Init
// ============================================================
void initFirebase() {
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  
  // Register this camera in Firebase
  String basePath = String("cameras/") + CAMERA_ID;
  Firebase.setString(fbData, basePath + "/status", "online");
  Firebase.setString(fbData, basePath + "/ip_address", WiFi.localIP().toString());
  // ⚠️ Also store stream URL so the app can display the live feed
  // Format: http://<IP>:81/stream — the camera serves this automatically
  Firebase.setString(fbData, basePath + "/stream_url",
                     "http://" + WiFi.localIP().toString() + ":81/stream");
  
  Serial.println("✅ Firebase connected");
}

// ============================================================
// Send Image to Roboflow
// ⚠️ Same API key and model as entrance camera
// ============================================================
String sendToRoboflow(uint8_t* buf, size_t len) {
  String url = "https://detect.roboflow.com/";
  url += ROBOFLOW_MODEL;
  url += "?api_key=" + String(ROBOFLOW_API_KEY);
  url += "&confidence=40&overlap=30&format=json";

  String b64 = base64::encode(buf, len);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  int code = http.POST("image=" + b64);
  String resp = (code == HTTP_CODE_OK) ? http.getString() : "";
  http.end();
  return resp;
}

// ============================================================
// Detect if Any Vehicle is Present in the Frame
// Returns true if vehicle detected above confidence threshold
// ============================================================
bool detectVehiclePresence(String json) {
  DynamicJsonDocument doc(8192);
  if (deserializeJson(doc, json) != DeserializationError::Ok) return false;

  JsonArray predictions = doc["predictions"];
  for (JsonObject pred : predictions) {
    String cls = pred["class"].as<String>();
    float conf = pred["confidence"].as<float>();

    // ⚠️ Match class names to your Roboflow model labels
    if ((cls == "car" || cls == "motorcycle" || cls == "truck") &&
        conf >= CONFIDENCE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Update Slot Occupancy in Firebase
// ============================================================
void updateSlotOccupancy(bool occupied) {
  String path = "parking_spots/slot_" + String(SLOT_ID);

  Firebase.setBool(fbData, path + "/occupied", occupied);

  if (occupied) {
    // Vehicle arrived
    Firebase.setInt(fbData, path + "/entry_time", (int)(millis() / 1000));
    Serial.printf("🔴 Slot %d → OCCUPIED\n", SLOT_ID);
  } else {
    // Vehicle left — clear slot data
    Firebase.setString(fbData, path + "/vehicle_type",  "");
    Firebase.setString(fbData, path + "/license_plate", "");
    Firebase.setInt(fbData,    path + "/entry_time",    0);
    Serial.printf("🟢 Slot %d → AVAILABLE\n", SLOT_ID);
  }
}
