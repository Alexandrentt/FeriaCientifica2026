#include "push.h"
#include "config.h"
#include "jsonutil.h"
#include "sensors.h"
#include "settings.h"
#include <Arduino.h>
#include <WiFiS3.h>
#include <stdio.h>
#include <string.h>

static uint32_t g_lastPush = 0;
static bool g_everPushed = false;

// Parsea "http://host[:puerto][/ruta]" → host, puerto y ruta.
static bool parseUrl(const char* url, char* host, size_t hostCap,
                     uint16_t& port, char* path, size_t pathCap) {
  const char* p = url;
  if (strncmp(p, "http://", 7) == 0) p += 7;
  else if (strncmp(p, "https://", 8) == 0) return false;  // sin TLS en la placa

  const char* slash = strchr(p, '/');
  const char* colon = strchr(p, ':');
  size_t hostLen = slash ? (size_t)(slash - p) : strlen(p);
  if (colon && (!slash || colon < slash)) {
    hostLen = (size_t)(colon - p);
  }
  if (hostLen == 0 || hostLen >= hostCap) return false;
  memcpy(host, p, hostLen);
  host[hostLen] = '\0';

  port = 80;
  if (colon && (!slash || colon < slash)) {
    port = (uint16_t)atoi(colon + 1);
    if (port == 0) port = 80;
  }

  const char* rest = slash ? slash : "/";
  strncpy(path, rest, pathCap - 1);
  path[pathCap - 1] = '\0';
  return true;
}

// Construye el JSON: {"fw":"...","device":"...","uptime":N,"values":{...}}
static void buildPayload(char* buf, size_t cap) {
  char dev[48];
  jsonEsc(cfg().deviceName, dev, sizeof(dev));

  int off = snprintf(buf, cap, "{\"fw\":\"" FW_VERSION "\",\"device\":\"%s\","
                                "\"uptime\":%lu,\"values\":{",
                     dev, (unsigned long)(millis() / 1000UL));
  if (off < 0 || (size_t)off >= cap) { buf[0] = '\0'; return; }

  for (int i = 0; i < sensorsCount(); i++) {
    const Channel* c = sensorsAt(i);
    if (!c || !c->valid) continue;
    char id[32], num[24];
    jsonEsc(c->id, id, sizeof(id));
    fmtNum(num, sizeof(num), c->value, 2);
    int n = snprintf(buf + off, cap - (size_t)off, "%s\"%s\":%s",
                     (i > 0) ? "," : "", id, num);
    if (n < 0 || (size_t)n >= cap - (size_t)off) break;
    off += n;
  }
  snprintf(buf + off, cap - (size_t)off, "}}");
}

static bool pushOnce() {
  if (WiFi.status() != WL_CONNECTED) return false;
  const char* url = cfg().pushUrl;
  if (!url[0]) return false;

  char host[64], path[96];
  uint16_t port = 80;
  if (!parseUrl(url, host, sizeof(host), port, path, sizeof(path))) {
    Serial.println("[push] URL no válida (usa http://host:puerto/ruta)");
    return false;
  }

  char payload[384];
  buildPayload(payload, sizeof(payload));

  WiFiClient client;
  if (!client.connect(host, port)) {
    Serial.print("[push] no conecta con ");
    Serial.println(host);
    return false;
  }

  char head[192];
  int hl = snprintf(head, sizeof(head),
                    "POST %s HTTP/1.1\r\n"
                    "Host: %s\r\n"
                    "Content-Type: application/json\r\n"
                    "Content-Length: %d\r\n"
                    "Connection: close\r\n\r\n",
                    path, host, (int)strlen(payload));
  client.write((const uint8_t*)head, (size_t)hl);
  client.print(payload);

  // Espera breve a la respuesta para liberar el socket
  uint32_t t0 = millis();
  while (client.connected() && millis() - t0 < 1500) {
    while (client.available()) client.read();
    delay(5);
  }
  client.stop();

  Serial.print("[push] enviado → ");
  Serial.print(host);
  Serial.print(':');
  Serial.print(port);
  Serial.print(path);
  Serial.print("  ");
  Serial.println(payload);
  return true;
}

void pushTick(uint32_t now) {
  if (!cfg().pushUrl[0]) return;
  uint32_t period = cfg().pushPeriodMs;
  if (period < 1000UL) period = 1000UL;
  if (g_everPushed && (now - g_lastPush) < period) return;
  if (!g_everPushed && g_lastPush != 0 && (now - g_lastPush) < period) return;
  if (pushOnce()) {
    g_lastPush = now;
    g_everPushed = true;
  }
}

void pushKick() { g_lastPush = 0; g_everPushed = false; }
