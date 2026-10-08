#include <WiFiS3.h>
#include <WiFiUdp.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

// Configura estos valores SOLO en el Arduino. No los subas a un repositorio público.
char ssid[] = "TU_HOTSPOT";
char pass[] = "TU_PASSWORD";

// IP de la PC que ejecuta Bun, dentro de la red del teléfono.
IPAddress pcIP(192, 168, 1, 100);
unsigned int pcPort = 5005;

WiFiUDP Udp;
Adafruit_MPU6050 mpu;

const int pinMQ2 = A0;
const int pinBuzzer = 8;
const int UMBRAL_BUZZER = 700;

bool mpuDisponible = false;

void setup() {
  Serial.begin(115200);
  pinMode(pinBuzzer, OUTPUT);
  digitalWrite(pinBuzzer, LOW);

  Wire.begin();
  mpuDisponible = mpu.begin();

  if (mpuDisponible) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("MPU6050 detectado.");
  } else {
    Serial.println("MPU6050 no detectado. Se usaran valores de respaldo.");
  }

  WiFi.begin(ssid, pass);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi conectado. IP Arduino: ");
    Serial.println(WiFi.localIP());
    tone(pinBuzzer, 1500, 200);
  } else {
    Serial.println("No se pudo conectar al WiFi.");
  }

  Udp.begin(pcPort);
}

void loop() {
  float ax = 0.12;
  float ay = -0.05;
  float az = 9.81;
  float gx = 0.01;
  float gy = 0.00;
  float gz = 0.02;

  if (mpuDisponible) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    ax = a.acceleration.x;
    ay = a.acceleration.y;
    az = a.acceleration.z;
    gx = g.gyro.x;
    gy = g.gyro.y;
    gz = g.gyro.z;
  }

  int valorGas = analogRead(pinMQ2);

  if (valorGas >= UMBRAL_BUZZER) {
    digitalWrite(pinBuzzer, HIGH);
  } else {
    digitalWrite(pinBuzzer, LOW);
  }

  char mensaje[100];
  snprintf(mensaje, sizeof(mensaje), "%d,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f",
           valorGas, ax, ay, az, gx, gy, gz);

  if (WiFi.status() == WL_CONNECTED) {
    Udp.beginPacket(pcIP, pcPort);
    Udp.write(mensaje);
    Udp.endPacket();
  }

  delay(150);
}
