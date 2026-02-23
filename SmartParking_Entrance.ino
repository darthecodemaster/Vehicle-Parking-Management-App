// ============================================================
// SmartParking_Entrance.ino
// ESP32-CAM — Entrance Camera Firmware
// ============================================================
// FUNCTION: Captures vehicle images → sends to Roboflow API
// → parses detection result → writes check-in data to Firebase
//
// BOARD: AI-Thinker ESP32-CAM
// ARDUINO IDE: Tools → Board → ESP32 Wrover Module
//              Tools → Partition Scheme → Huge APP (3MB No OTA)
//
// REQUIRED LIBRARIES (Install via Library Manager):
//   - FirebaseESP32    by Mobizt         (v4.4.x)
//   - ArduinoJson      by Benoit Blanchon (v6.x)
//   - base64           by Densaugeo       (v1.x)
// ============================================================

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <FirebaseESP32.h>
#include <base64.h>

// ============================================================
// ⚠️ CONFIGURATION — EDIT THESE VALUES BEFORE FLASHING
// ============================================================

// WiFi — must be 2.4GHz (ESP32 does NOT support 5GHz)
#define WIFI_SSID         "YOUR_WIFI_SSID"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"

// Roboflow — plug in your API key and model ID
// Get from: roboflow.com → your project → API → API Key
#define ROBOFLOW_API_KEY  "YOUR_ROBOFLOW_API_KEY"
#define ROBOFLOW_MODEL    "YOUR_MODEL_ID/VERSION"
// Example: "parking-detection/1"
// Full endpoint built below — do NOT include https:// here

// Firebase — plug in your Realtime Database credentials
// Get from: Firebase Console → Project Settings → Service Accounts
#define FIREBASE_HOST     "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH     "YOUR_DATABASE_SECRET_OR_LEGACY_TOKEN"

// Camera position ID (for heartbeat and logging)
#define CAMERA_ID         "entrance"

// Detection settings
#define CONFIDENCE_THRESHOLD  0.55   // Minimum confidence to accept detection (0.0–1.0)
#define DETECTION_COOLDOWN_MS 5000   // Milliseconds to wait after a vehicle is detected

// ============================================================
// Camera Pin Definitions — AI-Thinker ESP32-CAM Board
// Do NOT change unless using a different ESP32-CAM variant
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

unsigned long lastDetectionTime = 0;
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // Every 30 seconds

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Smart Parking — Entrance Camera ===");

  initCamera();
  connectWiFi();
  initFirebase();

  Serial.println("✅ System ready. Monitoring entrance...");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Send heartbeat to Firebase every 30 seconds
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }

  // Wait out cooldown period after last detection
  if (millis() - lastDetectionTime < DETECTION_COOLDOWN_MS) {
    delay(100);
    return;
  }

  // Capture image and run detection
  camera_fb_t* fb = captureImage();
  if (!fb) {
    delay(500);
    return;
  }

  // Send image to Roboflow and get prediction
  String jsonResponse = sendToRoboflow(fb->buf, fb->len);
  esp_camera_fb_return(fb); // Free camera buffer ASAP

  if (jsonResponse.isEmpty()) {
    delay(500);
    return;
  }

  // Parse the Roboflow response
  String vehicleType = "";
  String licensePlate = "";
  float bestConfidence = 0.0;

  parseRoboflowResponse(jsonResponse, vehicleType, licensePlate, bestConfidence);

  if (!vehicleType.isEmpty() && bestConfidence >= CONFIDENCE_THRESHOLD) {
    Serial.printf("🚗 Vehicle detected: %s (%.0f%% confidence)\n",
                  vehicleType.c_str(), bestConfidence * 100);

    processVehicleCheckIn(vehicleType, licensePlate);
    lastDetectionTime = millis();
  } else {
    Serial.println("No vehicle detected.");
  }

  delay(200);
}

// ============================================================
// Camera Initialization
// ============================================================
void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Use smaller frame size to reduce memory usage and send time
  // FRAMESIZE_VGA = 640x480 (better quality, more RAM)
  // FRAMESIZE_QVGA = 320x240 (use this if you get camera init errors)
  config.frame_size  = FRAMESIZE_VGA;
  config.jpeg_quality = 15;  // 0–63 lower = better quality but larger file
  config.fb_count    = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed: 0x%x\n", err);
    Serial.println("Try reducing frame_size to FRAMESIZE_QVGA");
    // Restart to try again
    ESP.restart();
  }
  Serial.println("✅ Camera initialized");
}

// ============================================================
// WiFi Connection
// ============================================================
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi connection failed. Restarting...");
    ESP.restart();
  }

  Serial.printf("\n✅ WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
}

// ============================================================
// Firebase Initialization
// ============================================================
void initFirebase() {
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  // Set the camera as online in Firebase
  Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/status", "online");
  Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/ip_address", WiFi.localIP().toString());

  Serial.println("✅ Firebase connected");
}

// ============================================================
// Capture Image
// ============================================================
camera_fb_t* captureImage() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Camera capture failed");
    return nullptr;
  }
  Serial.printf("📸 Captured image: %d bytes\n", fb->len);
  return fb;
}

// ============================================================
// Send Image to Roboflow API
// ⚠️ PLUG IN your Roboflow API key and model ID above
// ============================================================
String sendToRoboflow(uint8_t* buf, size_t len) {
  // Build the Roboflow endpoint URL
  // Format: https://detect.roboflow.com/<MODEL>?api_key=<KEY>&confidence=40&overlap=30
  String url = "https://detect.roboflow.com/";
  url += ROBOFLOW_MODEL;
  url += "?api_key=";
  url += ROBOFLOW_API_KEY;
  url += "&confidence=40&overlap=30&format=json";

  // Encode image to base64
  String b64Image = base64::encode(buf, len);

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL cert verification (okay for IoT dev)

  HTTPClient http;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  // POST the base64-encoded image
  String postBody = "image=" + b64Image;
  int httpCode = http.POST(postBody);

  String response = "";
  if (httpCode == HTTP_CODE_OK) {
    response = http.getString();
    Serial.println("✅ Roboflow responded");
  } else {
    Serial.printf("❌ Roboflow HTTP error: %d\n", httpCode);
  }

  http.end();
  return response;
}

// ============================================================
// Parse Roboflow JSON Response
// Extracts best vehicle class and license plate detection
// ============================================================
void parseRoboflowResponse(String json, String& vehicleType, String& licensePlate, float& confidence) {
  // Allocate JSON buffer — increase size if you have many predictions
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, json);

  if (err) {
    Serial.printf("❌ JSON parse error: %s\n", err.c_str());
    return;
  }

  JsonArray predictions = doc["predictions"];

  // Find the highest-confidence vehicle prediction
  for (JsonObject pred : predictions) {
    String cls = pred["class"].as<String>();
    float conf = pred["confidence"].as<float>();

    // ⚠️ Update these class names to match your Roboflow model's class names exactly
    if ((cls == "car" || cls == "motorcycle" || cls == "truck") && conf > confidence) {
      vehicleType = cls;
      confidence = conf;
    }

    // ⚠️ Update this class name if your model uses a different label for license plates
    if (cls == "license_plate" && conf > 0.5) {
      licensePlate = "PLATE_DETECTED"; // Replace with actual OCR if you have a plate model
    }
  }
}

// ============================================================
// Vehicle Check-In Logic
// Finds an available slot and writes to Firebase
// ============================================================
void processVehicleCheckIn(String vehicleType, String licensePlate) {
  // Find an available slot for this vehicle type in Firebase
  int slotId = findAvailableSlot(vehicleType);

  if (slotId >= 0) {
    assignSlot(slotId, vehicleType, licensePlate);
    incrementCheckinCount(vehicleType);
    logAccess("CHECK_IN", vehicleType, licensePlate, slotId);
    Serial.printf("✅ Slot %d assigned for %s\n", slotId, vehicleType.c_str());
  } else {
    // No slots available — write alert to Firebase
    Serial.println("⚠️ No slots available!");
    String alert = vehicleType + " parking full — " + String(millis());
    Firebase.pushString(fbData, "alerts/full_capacity", alert);
  }
}

// ============================================================
// Find Available Slot for Vehicle Type
// Returns slot index (0-based) or -1 if none available
// ============================================================
int findAvailableSlot(String vehicleType) {
  // Query all parking spots (assumes 10 slots max — adjust if needed)
  for (int i = 0; i <= 10; i++) {
    String path = "parking_spots/slot_" + String(i);

    // Read the slot's type
    if (Firebase.getString(fbData, path + "/type")) {
      String slotType = fbData.stringData();

      // Check if type matches and slot is not occupied
      if (slotType == vehicleType) {
        if (Firebase.getBool(fbData, path + "/occupied")) {
          bool occupied = fbData.boolData();
          if (!occupied) {
            return i; // Found an available slot
          }
        }
      }
    }
  }
  return -1; // No slot found
}

// ============================================================
// Assign Slot in Firebase
// ============================================================
void assignSlot(int slotId, String vehicleType, String licensePlate) {
  String path = "parking_spots/slot_" + String(slotId);

  Firebase.setBool(fbData,   path + "/occupied",      true);
  Firebase.setString(fbData, path + "/vehicle_type",  vehicleType);
  Firebase.setString(fbData, path + "/license_plate", licensePlate);
  Firebase.setInt(fbData,    path + "/entry_time",    (int)(millis() / 1000));
}

// ============================================================
// Increment Check-In Count for Vehicle Type
// ============================================================
void incrementCheckinCount(String vehicleType) {
  String path = "checkin_count/" + vehicleType;
  if (Firebase.getInt(fbData, path)) {
    int current = fbData.intData();
    Firebase.setInt(fbData, path, current + 1);
  }
}

// ============================================================
// Log Access Event
// ============================================================
void logAccess(String action, String vehicleType, String plate, int slotId) {
  DynamicJsonDocument logDoc(256);
  logDoc["action"]    = action;
  logDoc["type"]      = vehicleType;
  logDoc["plate"]     = plate;
  logDoc["slot"]      = slotId;
  logDoc["timestamp"] = (int)(millis() / 1000);

  String logJson;
  serializeJson(logDoc, logJson);
  Firebase.pushString(fbData, "logs/access", logJson);
}

// ============================================================
// Heartbeat — Lets the app know the camera is still online
// ============================================================
void sendHeartbeat() {
  String basePath = String("cameras/") + CAMERA_ID;
  Firebase.setString(fbData, basePath + "/status", "online");
  Firebase.setInt(fbData,    basePath + "/last_heartbeat", (int)(millis() / 1000));
}
