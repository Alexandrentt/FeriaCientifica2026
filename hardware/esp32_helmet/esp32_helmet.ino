#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// =========================
// CONFIGURACIÓN DEL PROTOTIPO
// =========================
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";

// IP de la computadora que ejecuta server/index.ts.
const char* SERVER_HOST = "192.168.1.100";
const uint16_t SERVER_PORT = 8787;
const char* SERVER_PATH = "/ws";

const char* HELMET_ID = "CASCO-001";

// MQ-2 conectado a una entrada ADC.
const int MQ2_PIN = 34;

// Buzzer mediante transistor/MOSFET. NO conectes un buzzer de 9-12 V
// directamente a un GPIO del ESP32.
const int BUZZER_PIN = 25;

Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 200; // 5 muestras/s para la primera prueba

void beepAlert() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(250);
  digitalWrite(BUZZER_PIN, LOW);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
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

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("WiFi conectado. IP del ESP32: ");
  Serial.println(WiFi.localIP());
}

void setupMPU6050() {
  Wire.begin();

  if (!mpu.begin()) {
    Serial.println("ERROR: no se encontró el MPU6050.");
    while (true) {
      beepAlert();
      delay(1000);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.println("MPU6050 listo.");
}

void setupWebSocket() {
  webSocket.begin(SERVER_HOST, SERVER_PORT, SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

void sendTelemetry() {
  sensors_event_t accel, gyro, temperature;
  mpu.getEvent(&accel, &gyro, &temperature);

  int gasRaw = analogRead(MQ2_PIN);
  int battery = 100; // Reemplazar por lectura real del divisor de tensión.

  String json = "{";
  json += "\"helmetId\":\"" + String(HELMET_ID) + "\",";
  json += "\"timestamp\":" + String(millis()) + ",";
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

  // Alerta local preliminar. El valor debe calibrarse con el MQ-2 real.
  if (gasRaw >= 700) {
    beepAlert();
  }

  Serial.println(json);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  pinMode(MQ2_PIN, INPUT);

  setupMPU6050();
  connectWiFi();
  setupWebSocket();
}

void loop() {
  webSocket.loop();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    }
  }
}
