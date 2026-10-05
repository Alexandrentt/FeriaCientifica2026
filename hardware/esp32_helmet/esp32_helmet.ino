#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsClient.h>
#include <Preferences.h>
#include <Wire.h>
#include <time.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Preferences preferences;
WebServer setupServer(80);
WebSocketsClient webSocket;
Adafruit_MPU6050 mpu;

String wifiSsid;
String wifiPassword;
String serverHost;
uint16_t serverPort = 8787;
String helmetId;

const char* SETUP_AP_NAME = "CASCO-SETUP";
const char* SERVER_PATH = "/ws";

const int MQ2_PIN = 34;       // ADC1; GPIO34 es solo entrada.
const int BUZZER_PIN = 25;   // SOLO controla transistor/MOSFET.

const int GAS_WARNING = 520;
const int GAS_CRITICAL = 700;
const float IMPACT_ACCELERATION = 22.0;
const float IMPACT_GYRO = 280.0;
const float LOW_ACTIVITY_ACCEL_DELTA = 0.60;
const float LOW_ACTIVITY_GYRO = 35.0;

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 200;

enum BuzzerPattern { BUZZER_OFF, BUZZER_WARNING, BUZZER_CRITICAL };
BuzzerPattern buzzerPattern = BUZZER_OFF;
unsigned long buzzerStartedAt = 0;
bool buzzerOutput = false;

bool setupMode = false;
bool fallCandidate = false;
unsigned long impactAt = 0;

String htmlEscape(const String& value) {
  String result = value;
  result.replace("&", "&amp;");
  result.replace("<", "&lt;");
  result.replace(">", "&gt;");
  result.replace("\"", "&quot;");
  return result;
}

String jsonEscape(const String& value) {
  String result = value;
  result.replace("\\", "\\\\");
  result.replace("\"", "\\"");
  result.replace("\n", "\\n");
  result.replace("\r", "\\r");
  return result;
}

void setBuzzerPattern(BuzzerPattern pattern) {
  if (pattern > buzzerPattern || pattern == BUZZER_CRITICAL) {
    buzzerPattern = pattern;
    buzzerStartedAt = millis();
  }
}

void updateBuzzer() {
  if (buzzerPattern == BUZZER_OFF) {
    if (buzzerOutput) {
      digitalWrite(BUZZER_PIN, LOW);
      buzzerOutput = false;
    }
    return;
  }

  const unsigned long period = buzzerPattern == BUZZER_CRITICAL ? 300 : 700;
  const unsigned long onTime = buzzerPattern == BUZZER_CRITICAL ? 150 : 100;
  const unsigned long phase = (millis() - buzzerStartedAt) % period;
  const bool shouldBeOn = phase < onTime;

  if (shouldBeOn != buzzerOutput) {
    digitalWrite(BUZZER_PIN, shouldBeOn ? HIGH : LOW);
    buzzerOutput = shouldBeOn;
  }
}

void handleSetupPage() {
  String html = R"HTML(
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuración del casco</title>
<style>
body{font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f5f5f5}
main{background:white;padding:24px;border-radius:16px}
label{display:block;margin-top:14px;font-weight:600}
input{width:100%;box-sizing:border-box;padding:12px;margin-top:6px;border:1px solid #ccc;border-radius:8px}
button{margin-top:20px;width:100%;padding:13px;border:0;border-radius:8px;background:#111;color:white;font-weight:700}
small{color:#666}
</style>
</head>
<body><main>
<h1>Configuración del casco</h1>
<p>Esta configuración se guarda en la memoria del ESP32.</p>
<form method="POST" action="/save">
<label>Wi-Fi</label>
<input name="ssid" value=")HTML";
  html += htmlEscape(wifiSsid);
  html += R"HTML(" required>
<label>Contraseña</label>
<input name="password" type="password" value=")HTML";
  html += htmlEscape(wifiPassword);
  html += R"HTML(">
<label>IP / host del servidor</label>
<input name="server" value=")HTML";
  html += htmlEscape(serverHost);
  html += R"HTML(" required>
<label>Puerto</label>
<input name="port" type="number" value=")HTML";
  html += String(serverPort);
  html += R"HTML(" required>
<label>ID del casco</label>
<input name="helmet" value=")HTML";
  html += htmlEscape(helmetId);
  html += R"HTML(" required>
<button type="submit">Guardar y reiniciar</button>
</form>
<p><small>WebSocket: ws://HOST:PUERTO/ws</small></p>
</main></body></html>
)HTML";

  setupServer.send(200, "text/html; charset=utf-8", html);
}

void handleSetupSave() {
  if (!setupServer.hasArg("ssid") || !setupServer.hasArg("server") ||
      !setupServer.hasArg("port") || !setupServer.hasArg("helmet")) {
    setupServer.send(400, "text/plain", "Faltan datos.");
    return;
  }

  const int port = setupServer.arg("port").toInt();
  if (port < 1 || port > 65535) {
    setupServer.send(400, "text/plain", "Puerto inválido.");
    return;
  }

  preferences.putString("ssid", setupServer.arg("ssid"));
  preferences.putString("password", setupServer.arg("password"));
  preferences.putString("server", setupServer.arg("server"));
  preferences.putUShort("port", (uint16_t)port);
  preferences.putString("helmet", setupServer.arg("helmet"));

  setupServer.send(200, "text/html; charset=utf-8",
    "<h2>Configuración guardada.</h2><p>El ESP32 se reiniciará...</p>");

  delay(1200);
  ESP.restart();
}

bool loadConfiguration() {
  preferences.begin("helmet", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  serverHost = preferences.getString("server", "");
  serverPort = preferences.getUShort("port", 8787);
  helmetId = preferences.getString("helmet", "CASCO-001");
  return wifiSsid.length() > 0 && serverHost.length() > 0;
}

void startSetupPortal() {
  setupMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(SETUP_AP_NAME);

  Serial.println();
  Serial.println("=== MODO CONFIGURACION ===");
  Serial.println("Red: CASCO-SETUP");
  Serial.println("Abre: http://192.168.4.1");

  setupServer.on("/", HTTP_GET, handleSetupPage);
  setupServer.on("/save", HTTP_POST, handleSetupSave);
  setupServer.begin();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());

  Serial.print("Conectando a WiFi");
  unsigned long started = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    updateBuzzer();
    delay(100);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No se pudo conectar. Volviendo a CASCO-SETUP.");
    startSetupPortal();
    return;
  }

  Serial.print("WiFi conectado. IP del ESP32: ");
  Serial.println(WiFi.localIP());

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  started = millis();

  while (now < 1700000000 && millis() - started < 10000) {
    updateBuzzer();
    delay(100);
    now = time(nullptr);
  }

  if (now >= 1700000000) Serial.println("Reloj sincronizado.");
  else Serial.println("Aviso: NTP no disponible; se usará millis como respaldo.");
}

void setupMPU6050() {
  Wire.begin(21, 22);

  if (!mpu.begin()) {
    Serial.println("ERROR: no se encontró el MPU6050.");
    setBuzzerPattern(BUZZER_CRITICAL);
    while (true) {
      updateBuzzer();
      delay(5);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  Serial.println("MPU6050 listo.");
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  (void)payload;
  (void)length;

  switch (type) {
    case WStype_CONNECTED:
      Serial.println("WebSocket conectado al servidor.");
      break;
    case WStype_DISCONNECTED:
      Serial.println("WebSocket desconectado.");
      break;
    case WStype_ERROR:
      Serial.println("Error WebSocket.");
      break;
    default:
      break;
  }
}

void setupWebSocket() {
  webSocket.begin(serverHost.c_str(), serverPort, SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

unsigned long long timestampMs() {
  time_t now = time(nullptr);
  if (now >= 1700000000) return (unsigned long long)now * 1000ULL;
  return (unsigned long long)millis();
}

void updateLocalSafety(float acceleration, float rotation, int gasRaw) {
  if (gasRaw >= GAS_CRITICAL) {
    setBuzzerPattern(BUZZER_CRITICAL);
  } else if (gasRaw >= GAS_WARNING) {
    setBuzzerPattern(BUZZER_WARNING);
  }

  const bool impact =
    acceleration >= IMPACT_ACCELERATION || rotation >= IMPACT_GYRO;

  if (impact) {
    setBuzzerPattern(BUZZER_CRITICAL);
    fallCandidate = true;
    impactAt = millis();
    return;
  }

  if (fallCandidate && millis() - impactAt >= 1200) {
    const bool lowActivity =
      fabs(acceleration - 9.81f) <= LOW_ACTIVITY_ACCEL_DELTA &&
      rotation <= LOW_ACTIVITY_GYRO;

    if (lowActivity) setBuzzerPattern(BUZZER_CRITICAL);
    fallCandidate = false;
  }
}

void sendTelemetry() {
  sensors_event_t accel, gyro, temperature;
  mpu.getEvent(&accel, &gyro, &temperature);

  const int gasRaw = analogRead(MQ2_PIN);
  const int battery = 100; // Placeholder hasta instalar divisor de tensión.

  const float acceleration = sqrtf(
    accel.acceleration.x * accel.acceleration.x +
    accel.acceleration.y * accel.acceleration.y +
    accel.acceleration.z * accel.acceleration.z
  );
  const float rotation = sqrtf(
    gyro.gyro.x * gyro.gyro.x +
    gyro.gyro.y * gyro.gyro.y +
    gyro.gyro.z * gyro.gyro.z
  );

  // La alarma local se evalúa antes de cualquier comunicación.
  updateLocalSafety(acceleration, rotation, gasRaw);

  String json = "{";
  json += "\"helmetId\":\"" + jsonEscape(helmetId) + "\",";
  json += "\"timestamp\":" + String(timestampMs()) + ",";
  json += "\"accel\":{";
  json += "\"x\":" + String(accel.acceleration.x, 3) + ",";
  json += "\"y\":" + String(accel.acceleration.y, 3) + ",";
  json += "\"z\":" + String(accel.acceleration.z, 3) + "},";
  json += "\"gyro\":{";
  json += "\"x\":" + String(gyro.gyro.x, 3) + ",";
  json += "\"y\":" + String(gyro.gyro.y, 3) + ",";
  json += "\"z\":" + String(gyro.gyro.z, 3) + "},";
  json += "\"gas\":" + String(gasRaw) + ",";
  json += "\"battery\":" + String(battery);
  json += "}";

  webSocket.sendTXT(json);
  Serial.println(json);
}

void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(MQ2_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db);

  setupMPU6050();

  if (!loadConfiguration()) {
    startSetupPortal();
    return;
  }

  connectWiFi();

  if (!setupMode) setupWebSocket();
}

void loop() {
  updateBuzzer();

  if (setupMode) {
    setupServer.handleClient();
    return;
  }

  webSocket.loop();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    }
  }
}
