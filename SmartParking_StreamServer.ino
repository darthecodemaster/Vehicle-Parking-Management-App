// ============================================================
// SmartParking_StreamServer.ino
// ESP32-CAM — MJPEG Live Stream Server (for CCTV screen)
// ============================================================
// This firmware is for cameras that ONLY need to stream video.
// Use this on your entrance/exit cameras if you want the app
// to show a live feed WITHOUT doing AI detection on that camera.
//
// OR: Combine detection + streaming by running both in the same
// sketch (advanced — see note at bottom of this file).
//
// STREAM URL: http://<IP_ADDRESS>:81/stream
// Store this URL in Firebase: cameras/<id>/stream_url
// ============================================================

#include "esp_camera.h"
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "driver/ledc.h"
#include "esp_http_server.h"
#include <WiFi.h>
#include <FirebaseESP32.h>

// ============================================================
// ⚠️ CONFIGURATION
// ============================================================
#define WIFI_SSID      "YOUR_WIFI_SSID"
#define WIFI_PASSWORD  "YOUR_WIFI_PASSWORD"

#define FIREBASE_HOST  "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH  "YOUR_DATABASE_SECRET"

// ⚠️ Unique ID for this camera in Firebase
#define CAMERA_ID      "entrance"  // or "exit", "slot_cam_0", etc.

// ============================================================
// Camera Pins — AI-Thinker ESP32-CAM
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
// MJPEG Stream Part Boundary
// ============================================================
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE =
    "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART =
    "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;

FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

// ============================================================
// Stream Handler — serves MJPEG frames to connected clients
// ============================================================
static esp_err_t stream_handler(httpd_req_t* req) {
  camera_fb_t* fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t* _jpg_buf = NULL;
  char* part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  // Allow CORS so the React Native WebView can load from any origin
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Frame capture failed");
      res = ESP_FAIL;
      break;
    }

    if (fb->format != PIXFORMAT_JPEG) {
      bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
      esp_camera_fb_return(fb);
      fb = NULL;
      if (!jpeg_converted) {
        res = ESP_FAIL;
        break;
      }
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    if (res == ESP_OK) res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    if (res == ESP_OK) {
      size_t hlen = snprintf((char*)part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char*)part_buf, hlen);
    }
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char*)_jpg_buf, _jpg_buf_len);

    if (fb) { esp_camera_fb_return(fb); fb = NULL; }
    else if (_jpg_buf) { free(_jpg_buf); _jpg_buf = NULL; }

    if (res != ESP_OK) break;
  }
  return res;
}

// ============================================================
// Start HTTP Stream Server on port 81
// ============================================================
void startStreamServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println("✅ Stream server started on port 81");
    Serial.printf("📺 Stream URL: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
  }
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("=== Smart Parking — Stream Server ===");

  // Camera init
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0; config.ledc_timer = LEDC_TIMER_0;
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
  config.frame_size   = FRAMESIZE_VGA;  // 640×480 for stream quality
  config.jpeg_quality = 12;
  config.fb_count     = 2;             // 2 buffers for smoother streaming

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed");
    ESP.restart();
  }

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int t = 0;
  while (WiFi.status() != WL_CONNECTED && t++ < 30) { delay(500); Serial.print("."); }
  if (WiFi.status() != WL_CONNECTED) ESP.restart();
  Serial.printf("\n✅ WiFi OK: %s\n", WiFi.localIP().toString().c_str());

  // Firebase — store stream URL so app can read it automatically
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  String streamUrl = "http://" + WiFi.localIP().toString() + ":81/stream";
  Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/status",     "online");
  Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/stream_url", streamUrl);
  Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/ip_address", WiFi.localIP().toString());

  startStreamServer();
}

// ============================================================
// LOOP — Just keep WiFi alive and send heartbeat
// ============================================================
unsigned long lastHB = 0;
void loop() {
  if (millis() - lastHB > 30000) {
    Firebase.setString(fbData, String("cameras/") + CAMERA_ID + "/status", "online");
    Firebase.setInt(fbData, String("cameras/") + CAMERA_ID + "/last_heartbeat", (int)(millis() / 1000));
    lastHB = millis();
  }
  delay(100);
}

// ============================================================
// NOTE: Combining Detection + Streaming
// If you want ONE camera to both stream video AND run Roboflow
// detection, flash SmartParking_Entrance.ino AND start the
// stream server in its setup(). The detection loop and stream
// server run on separate FreeRTOS tasks automatically.
// The stream server runs on port 81; detection uses HTTPS out.
// ============================================================
