// ===========================================================================
//  Panel de sensores — Arduino UNO R4 WiFi (RA4M1 + módulo ESP32-S3-MINI-1)
// ---------------------------------------------------------------------------
//  Arranque:
//    1. Carga ajustes de EEPROM (credenciales WiFi, nombre, endpoint).
//    2. Conecta en STA; si falla o no hay SSID → modo AP "UNO-R4-Setup".
//    3. Levanta el servidor web (página + /api/state + /api/config).
//  loop(): muestrear sensores → servir web → push periódico → vigilar WiFi.
// ===========================================================================
#include <Arduino.h>
#include <WiFiS3.h>

#include "config.h"
#include "push.h"
#include "sensors.h"
#include "settings.h"
#include "web_server.h"

static WiFiServer g_server(HTTP_PORT);
static bool g_apMode = false;
static uint32_t g_lastWifiCheck = 0;

static void blinkLed(bool on) { digitalWrite(LED_BUILTIN, on ? HIGH : LOW); }

static bool startSTA() {
  if (!cfg().ssid[0]) return false;

  Serial.print("[wifi] conectando a \"");
  Serial.print(cfg().ssid);
  Serial.println("\"…");

  WiFi.begin(cfg().ssid, cfg().pass);
  uint32_t t0 = millis();
  while (millis() - t0 < WIFI_CONNECT_TIMEOUT_MS) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("[wifi] conectado. IP: ");
      Serial.println(WiFi.localIP());
      Serial.print("[wifi] RSSI: ");
      Serial.println(WiFi.RSSI());
      return true;
    }
    blinkLed((millis() / 150) % 2);
    delay(50);
  }
  Serial.println("[wifi] sin conexión (timeout)");
  return false;
}

static void startAP() {
  g_apMode = true;
  Serial.print("[wifi] iniciando punto de acceso \"");
  Serial.print(AP_SSID);
  Serial.println("\"…");
  WiFi.beginAP(AP_SSID, AP_PASS);
  delay(500);
  Serial.print("[wifi] AP mode. IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[wifi] únete a la red y abre http://");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) { /* espera USB CDC máx 3 s */ }

  pinMode(LED_BUILTIN, OUTPUT);
  blinkLed(false);

  Serial.println();
  Serial.println("======================================");
  Serial.print("  Panel de sensores · FW ");
  Serial.println(FW_VERSION);
  Serial.println("  Arduino UNO R4 WiFi (RA4M1 + ESP32-S3)");
  Serial.println("======================================");

  settingsLoad();
  sensorsBegin();

  if (!startSTA()) {
    startAP();
  }

  webBegin(&g_server, g_apMode);
  Serial.println("[sys] servidor web listo");

  if (cfg().pushUrl[0]) {
    pushKick();
    Serial.print("[sys] envío de datos a: ");
    Serial.println(cfg().pushUrl);
  }

  blinkLed(true);
}

void loop() {
  uint32_t now = millis();

  sensorsTick(now);
  webLoop();
  pushTick(now);

  // Vigila la conexión WiFi: reintenta cada WIFI_RETRY_MS si se cae
  if (!g_apMode && now - g_lastWifiCheck > WIFI_RETRY_MS) {
    g_lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[wifi] conexión perdida, reintentando…");
      WiFi.begin(cfg().ssid, cfg().pass);
    }
  }

  // LED: parpadeo lento = STA ok, rápido = AP, muy rápido = reconectando
  uint32_t period = g_apMode ? 500
                  : (WiFi.status() == WL_CONNECTED ? 2000 : 200);
  blinkLed((now / period) % 2);
}
