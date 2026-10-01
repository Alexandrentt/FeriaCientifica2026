#pragma once
#include <stdint.h>
#include "config.h"

// Estructura persistida en EEPROM. Todos los campos se fuerzan a terminar
// en '\0' al cargar, por si la EEPROM contiene basura.
struct Settings {
  uint16_t magic;
  char deviceName[24];
  char ssid[33];
  char pass[65];
  char pushUrl[96];
  uint32_t pushPeriodMs;
};

// Ajustes activos (en RAM)
Settings& cfg();

// Carga desde EEPROM (o valores por defecto si no hay nada válido)
void settingsLoad();

// Guarda en EEPROM. Incrementa settingsVersion() si tiene éxito.
bool settingsSave();

// true si la EEPROM de esta placa es suficientemente grande
bool settingsPersistent();

// Se incrementa cada guardado (para que main.cpp reparse su URL de push)
uint32_t settingsVersion();
