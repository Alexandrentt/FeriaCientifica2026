#include <WiFiS3.h>
#include <WiFiUdp.h>

// Este firmware permite probar el enlace completo aunque los sensores no esten conectados.
// NO contiene credenciales reales.

char ssid[] = "TU_HOTSPOT";
char pass[] = "TU_PASSWORD";

IPAddress pcIP(192, 168, 1, 100);
unsigned int pcPort = 5005;

WiFiUDP Udp;

const int pinBuzzer = 8;

void setup() {
  Serial.begin(115200);
  pinMode(pinBuzzer, OUTPUT);
  digitalWrite(pinBuzzer, LOW);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado.");
  Serial.print("IP Arduino: ");
  Serial.println(WiFi.localIP());

  tone(pinBuzzer, 1500, 200);
  Udp.begin(pcPort);
}

void loop() {
  int gasSimulado = 65;
  float ax = 0.12;
  float ay = -0.05;
  float az = 9.81;
  float gx = 0.01;
  float gy = 0.00;
  float gz = 0.02;

  char mensaje[100];
  snprintf(mensaje, sizeof(mensaje), "%d,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f",
           gasSimulado, ax, ay, az, gx, gy, gz);

  Udp.beginPacket(pcIP, pcPort);
  Udp.write(mensaje);
  Udp.endPacket();

  delay(200);
}
