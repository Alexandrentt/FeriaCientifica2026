#include "settings.h"
#include <Arduino.h>
#include <EEPROM.h>
#include <string.h>

static const uint16_t kMagic = 0x5241;   // "RA"

static Settings g_cfg;
static bool g_persistent = false;
static uint32_t g_version = 1;

Settings& cfg() { return g_cfg; }
bool settingsPersistent() { return g_persistent; }
uint32_t settingsVersion() { return g_version; }

static void terminateAll() {
  g_cfg.deviceName[sizeof(g_cfg.deviceName) - 1] = '\0';
  g_cfg.ssid[sizeof(g_cfg.ssid) - 1] = '\0';
  g_cfg.pass[sizeof(g_cfg.pass) - 1] = '\0';
  g_cfg.pushUrl[sizeof(g_cfg.pushUrl) - 1] = '\0';
}

static void setDefaults() {
  memset(&g_cfg, 0, sizeof(g_cfg));
  g_cfg.magic = kMagic;
  strncpy(g_cfg.deviceName, DEVICE_NAME_DEFAULT, sizeof(g_cfg.deviceName) - 1);
  strncpy(g_cfg.ssid, WIFI_SSID, sizeof(g_cfg.ssid) - 1);
  strncpy(g_cfg.pass, WIFI_PASS, sizeof(g_cfg.pass) - 1);
  strncpy(g_cfg.pushUrl, PUSH_URL_DEFAULT, sizeof(g_cfg.pushUrl) - 1);
  g_cfg.pushPeriodMs = PUSH_PERIOD_DEFAULT_MS;
  terminateAll();
}

void settingsLoad() {
  setDefaults();

  g_persistent = EEPROM.length() >= (int)sizeof(Settings);
  if (!g_persistent) {
    Serial.print("[cfg] EEPROM insuficiente (");
    Serial.print(EEPROM.length());
    Serial.print(" < ");
    Serial.print((int)sizeof(Settings));
    Serial.println(" bytes): no se podrán guardar ajustes");
    return;
  }

  Settings stored;
  EEPROM.get(0, stored);
  if (stored.magic != kMagic) {
    Serial.println("[cfg] EEPROM vacía: usando valores de config.h");
    return;
  }
  stored.deviceName[sizeof(stored.deviceName) - 1] = '\0';
  stored.ssid[sizeof(stored.ssid) - 1] = '\0';
  stored.pass[sizeof(stored.pass) - 1] = '\0';
  stored.pushUrl[sizeof(stored.pushUrl) - 1] = '\0';
  if (stored.pushPeriodMs < 1000UL || stored.pushPeriodMs > 3600000UL) {
    stored.pushPeriodMs = PUSH_PERIOD_DEFAULT_MS;
  }
  g_cfg = stored;
  Serial.println("[cfg] ajustes cargados de EEPROM");
}

bool settingsSave() {
  if (!g_persistent) return false;
  g_cfg.magic = kMagic;
  terminateAll();
  EEPROM.put(0, g_cfg);
  g_version++;
  Serial.println("[cfg] ajustes guardados en EEPROM");
  return true;
}
