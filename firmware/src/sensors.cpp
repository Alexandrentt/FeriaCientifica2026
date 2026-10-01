#include "sensors.h"
#include <Arduino.h>
#include <WiFiS3.h>

// ===========================================================================
//  TUS SENSORES — edita solo esta tabla
// ---------------------------------------------------------------------------
//  Los sensores concretos están PENDIENTES de definir; mientras tanto queda
//  una tabla con canales de ejemplo listos (comenta/descomenta) y dos
//  canales internos que siempre funcionan (WiFi y uptime) para poder
//  comprobar la placa y la página sin tocar nada.
//
//  Para añadir un sensor:
//    1. Añade una línea en g_channels con su id/nombre/unidad/pin/tipo.
//    2. Si es de un tipo nuevo (I2C, SPI…), amplía ChanType + sample().
//  Los pines libres del UNO R4 WiFi: D0-D13, A0-A5 (I2C: A4=SDA, A5=SCL,
//  SPI: D11=MOSI D12=MISO D13=SCK, D10=CS), 3V3 y 5V en el header.
// ===========================================================================

static Channel g_channels[] = {
  // --- canales internos (siempre activos) ---
  { "wifi",   "Señal WiFi",        "dBm", "interno", CH_RSSI,    -1, -1, false, true,  2000, 0, false, 0 },
  { "uptime", "Tiempo encendido",  "s",   "interno", CH_UPTIME,  -1, -1, false, true, 10000, 0, false, 0 },

  // --- ejemplos listos para usar (ajusta los pines a tu montaje) ---
  { "pot",    "Ejemplo: potenciómetro / analógico en A0", "raw", "A0", CH_ANALOG,     A0, -1, false, true, 500, 0, false, 0 },
  { "boton",  "Ejemplo: botón en D2",                    "",    "D2", CH_DIGITAL,     2, -1, true,  true, 100, 0, false, 0 },
  { "alcance","Ejemplo: HC-SR04 en D3/D4",               "cm",  "D3/D4", CH_ULTRASONIC, 3,  4, false, true, 250, 0, false, 0 },

  // --- tus sensores van aquí (pendiente de definir) ---
  // { "dht_t", "Temperatura DHT22", "ºC",  "D5",  CH_..., 5, -1, false, true, 2000, 0, false, 0 },
  // { "ldr",   "Luz (LDR)",         "raw", "A1",  CH_ANALOG, A1, -1, false, true, 500, 0, false, 0 },
  // { "mq2",   "Gas MQ-2",          "raw", "A2",  CH_ANALOG, A2, -1, false, true, 1000, 0, false, 0 },
};

static const int kChannelCount = sizeof(g_channels) / sizeof(g_channels[0]);

void sensorsBegin() {
  for (int i = 0; i < kChannelCount; i++) {
    Channel& c = g_channels[i];
    c.valid = false;
    c.value = 0;
    if (!c.enabled) continue;
    switch (c.type) {
      case CH_ANALOG:
        pinMode(c.pin, INPUT);
        break;
      case CH_DIGITAL:
        pinMode(c.pin, c.pullup ? INPUT_PULLUP : INPUT);
        break;
      case CH_ULTRASONIC:
        pinMode(c.pin, OUTPUT);          // Trigger
        digitalWrite(c.pin, LOW);
        pinMode(c.pin2, INPUT);          // Echo
        break;
      default:
        break;                           // canales internos
    }
  }
}

static void sample(Channel& c, uint32_t now) {
  c.lastSampleMs = now;
  switch (c.type) {
    case CH_ANALOG:
      c.value = (float)analogRead(c.pin);
      c.valid = true;
      break;

    case CH_DIGITAL:
      c.value = digitalRead(c.pin) ? 1.0f : 0.0f;
      c.valid = true;
      break;

    case CH_ULTRASONIC: {
      digitalWrite(c.pin, LOW);
      delayMicroseconds(2);
      digitalWrite(c.pin, HIGH);
      delayMicroseconds(10);
      digitalWrite(c.pin, LOW);
      unsigned long us = pulseIn(c.pin2, HIGH, 25000UL);  // ~4 m máx
      if (us > 0) {
        c.value = (float)us / 58.0f;    // us → cm
        c.valid = true;
      } else {
        c.valid = false;                // sin eco: sin dato
      }
      break;
    }

    case CH_RSSI:
      if (WiFi.status() == WL_CONNECTED) {
        c.value = (float)WiFi.RSSI();
        c.valid = true;
      } else {
        c.valid = false;                // sin WiFi (o en modo AP)
      }
      break;

    case CH_UPTIME:
      c.value = (float)(millis() / 1000UL);
      c.valid = true;
      break;
  }
}

void sensorsTick(uint32_t now) {
  for (int i = 0; i < kChannelCount; i++) {
    Channel& c = g_channels[i];
    if (!c.enabled) continue;
    if (now - c.lastSampleMs < c.periodMs) continue;   // aún no toca
    sample(c, now);
  }
}

int sensorsCount() { return kChannelCount; }

const Channel* sensorsAt(int i) {
  if (i < 0 || i >= kChannelCount) return nullptr;
  return &g_channels[i];
}

const char* sensorsTypeName(const Channel& c) {
  switch (c.type) {
    case CH_ANALOG:     return "analog";
    case CH_DIGITAL:    return "digital";
    case CH_ULTRASONIC: return "ultrasonic";
    case CH_RSSI:       return "rssi";
    case CH_UPTIME:     return "uptime";
  }
  return "raw";
}
