#pragma once
#include <Arduino.h>
#include <stdint.h>

// Tipos de canal soportados. Para añadir un sensor de otro tipo
// (I2C, SPI, etc.) amplía ChanType y sample() en src/sensors.cpp.
enum ChanType : uint8_t {
  CH_ANALOG,      // lectura analógica cruda (LDR, MQ-2, humedad de suelo…)
  CH_DIGITAL,     // alta/baja (PIR, flama, reed, pulsador…)
  CH_ULTRASONIC,  // HC-SR04 (pin = Trigger, pin2 = Echo)
  CH_RSSI,        // señal WiFi (interno)
  CH_UPTIME       // tiempo encendido en segundos (interno)
};

struct Channel {
  const char* id;       // clave en el JSON ("a0", "pir"…)
  const char* name;     // nombre visible en la página
  const char* unit;     // unidad ("raw", "cm", "dBm"…)
  const char* pinLabel; // etiqueta de pin para la UI ("A0", "D3/D4", "interno")
  ChanType type;
  int pin;              // CH_ULTRASONIC: Trigger
  int pin2;             // CH_ULTRASONIC: Echo (-1 en el resto)
  bool pullup;          // CH_DIGITAL: usar INPUT_PULLUP
  bool enabled;
  uint32_t periodMs;    // cada cuánto muestrear
  // --- estado en runtime ---
  float value;
  bool valid;
  uint32_t lastSampleMs;
};

void sensorsBegin();
void sensorsTick(uint32_t now);

int sensorsCount();
const Channel* sensorsAt(int i);
const char* sensorsTypeName(const Channel& c);
