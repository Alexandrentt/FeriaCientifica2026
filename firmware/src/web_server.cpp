#include "web_server.h"
#include "config.h"
#include "jsonutil.h"
#include "page_html.h"
#include "push.h"
#include "sensors.h"
#include "settings.h"
#include <Arduino.h>
#include <stdio.h>
#include <string.h>

static WiFiServer* g_srv = nullptr;
static bool g_apMode = false;
static bool g_rebootPending = false;
static uint32_t g_rebootAt = 0;

// ---------------------------------------------------------------------------
// HTTP mínimo
// ---------------------------------------------------------------------------

// Lee una línea (sin \r\n). Devuelve longitud o -1 por timeout.
static int readLine(WiFiClient& c, char* buf, int cap) {
  int i = 0;
  uint32_t t0 = millis();
  while (millis() - t0 < 3000) {
    if (c.available()) {
      char ch = (char)c.read();
      if (ch == '\n') { buf[i] = '\0'; return i; }
      if (ch != '\r' && i < cap - 1) buf[i++] = ch;
    } else {
      if (!c.connected()) break;
      delay(1);
    }
  }
  buf[i] = '\0';
  return -1;
}

static bool startsWithCI(const char* s, const char* prefix) {
  for (size_t i = 0; prefix[i]; i++) {
    char a = s[i];
    if (!a) return false;
    char b = prefix[i];
    if (a >= 'A' && a <= 'Z') a += 32;
    if (b >= 'A' && b <= 'Z') b += 32;
    if (a != b) return false;
  }
  return true;
}

static void sendHeaders(WiFiClient& c, int code, const char* status,
                        const char* ctype, bool withLen, size_t len) {
  char h[256];
  int n = snprintf(h, sizeof(h),
                   "HTTP/1.1 %d %s\r\n"
                   "Content-Type: %s\r\n"
                   "Access-Control-Allow-Origin: *\r\n"
                   "Cache-Control: no-store\r\n"
                   "Connection: close\r\n",
                   code, status, ctype);
  if (withLen && n > 0 && (size_t)n < sizeof(h)) {
    n += snprintf(h + n, sizeof(h) - (size_t)n, "Content-Length: %u\r\n",
                  (unsigned)len);
  }
  if (n > 0 && (size_t)n < sizeof(h)) {
    n += snprintf(h + n, sizeof(h) - (size_t)n, "\r\n");
  }
  c.write((const uint8_t*)h, (size_t)(n > 0 ? n : 0));
}

static void sendBody(WiFiClient& c, int code, const char* status,
                     const char* ctype, const char* body) {
  sendHeaders(c, code, status, ctype, true, strlen(body));
  c.print(body);
}

// Escapa e imprime una cadena entre comillas en JSON (usa buffer pequeño).
static void jsonStr(WiFiClient& c, const char* s) {
  char buf[112];
  jsonEsc(s, buf, sizeof(buf));
  c.print('"');
  c.print(buf);
  c.print('"');
}

// ---------------------------------------------------------------------------
// GET /api/state — estado completo, en streaming (sin buffer grande)
// ---------------------------------------------------------------------------
static const char* typeDec[] = {"analog", "digital", "ultrasonic", "rssi", "uptime"};

static void sendState(WiFiClient& c) {
  sendHeaders(c, 200, "OK", "application/json", false, 0);

  char esc[96];
  c.print("{\"fw\":\"" FW_VERSION "\",\"device\":");
  jsonStr(c, cfg().deviceName);
  c.print(",\"mode\":");
  jsonStr(c, g_apMode ? "ap" : "sta");
  c.print(",\"ip\":");
  jsonStr(c, WiFi.localIP().toString().c_str());
  c.print(",\"ssid\":");
  jsonStr(c, cfg().ssid);
  c.print(",\"rssi\":");
  if (!g_apMode && WiFi.status() == WL_CONNECTED) {
    c.print((int)WiFi.RSSI());
  } else {
    c.print("null");
  }
  c.print(",\"uptime\":");
  c.print((unsigned long)(millis() / 1000UL));
  c.print(",\"cfg\":{\"name\":");
  jsonStr(c, cfg().deviceName);
  c.print(",\"push\":");
  jsonStr(c, cfg().pushUrl);
  c.print(",\"period\":");
  c.print((unsigned long)cfg().pushPeriodMs);
  c.print("},\"channels\":[");

  for (int i = 0; i < sensorsCount(); i++) {
    const Channel* ch = sensorsAt(i);
    if (!ch) continue;
    if (i) c.print(',');
    c.print("{\"id\":");
    jsonStr(c, ch->id);
    c.print(",\"name\":");
    jsonStr(c, ch->name);
    c.print(",\"unit\":");
    jsonStr(c, ch->unit);
    c.print(",\"pin\":");
    jsonStr(c, ch->pinLabel);
    c.print(",\"type\":");
    jsonStr(c, sensorsTypeName(*ch));
    int dec = (ch->type == CH_ULTRASONIC) ? 1 : 0;
    c.print(",\"dec\":");
    c.print(dec);
    c.print(",\"value\":");
    if (ch->valid) {
      char num[24];
      fmtNum(num, sizeof(num), ch->value, 2);
      c.print(num);
    } else {
      c.print("null");
    }
    c.print(",\"valid\":");
    c.print(ch->valid ? "true" : "false");
    c.print('}');
  }
  c.print("]}");
}

// ---------------------------------------------------------------------------
// POST /api/config — guardar ajustes (form-urlencoded)
// ---------------------------------------------------------------------------
static int hexVal(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

static void urlDecode(const char* in, size_t len, char* out, size_t cap) {
  size_t o = 0;
  for (size_t i = 0; i < len && o + 1 < cap; i++) {
    char ch = in[i];
    if (ch == '+') ch = ' ';
    else if (ch == '%' && i + 2 < len) {
      int hi = hexVal(in[i + 1]), lo = hexVal(in[i + 2]);
      if (hi >= 0 && lo >= 0) { ch = (char)((hi << 4) | lo); i += 2; }
    }
    out[o++] = ch;
  }
  out[o] = '\0';
}

// ¿Está la clave? → devuelve true y llena out (vacío si no tiene valor).
static bool getParam(const char* body, const char* key, char* out, size_t cap) {
  out[0] = '\0';
  size_t klen = strlen(key);
  const char* p = body;
  while (*p) {
    const char* amp = strchr(p, '&');
    size_t segLen = amp ? (size_t)(amp - p) : strlen(p);
    const char* eq = (const char*)memchr(p, '=', segLen);
    size_t thisKeyLen = eq ? (size_t)(eq - p) : segLen;
    if (thisKeyLen == klen && strncmp(p, key, klen) == 0) {
      if (eq) urlDecode(eq + 1, segLen - thisKeyLen - 1, out, cap);
      return true;
    }
    if (!amp) break;
    p = amp + 1;
  }
  return false;
}

static void handleConfig(WiFiClient& c, const char* body) {
  char val[96];
  bool reboot = false;
  bool changed = false;

  if (getParam(body, "name", val, sizeof(val)) && val[0]) {
    strncpy(cfg().deviceName, val, sizeof(cfg().deviceName) - 1);
    cfg().deviceName[sizeof(cfg().deviceName) - 1] = '\0';
    changed = true;
  }
  if (getParam(body, "ssid", val, sizeof(val)) && val[0]) {
    if (strcmp(cfg().ssid, val) != 0) {
      strncpy(cfg().ssid, val, sizeof(cfg().ssid) - 1);
      cfg().ssid[sizeof(cfg().ssid) - 1] = '\0';
      reboot = true;
      changed = true;
    }
  }
  if (getParam(body, "pass", val, sizeof(val)) && val[0]) {
    strncpy(cfg().pass, val, sizeof(cfg().pass) - 1);
    cfg().pass[sizeof(cfg().pass) - 1] = '\0';
    reboot = true;
    changed = true;
  }
  if (getParam(body, "push", val, sizeof(val))) {
    if (strncmp(val, "http://", 7) != 0 && strncmp(val, "https://", 8) != 0 && val[0]) {
      sendBody(c, 400, "Bad Request", "application/json",
               "{\"ok\":false,\"err\":\"La URL debe empezar por http://\"}");
      return;
    }
    if (strcmp(cfg().pushUrl, val) != 0) {
      strncpy(cfg().pushUrl, val, sizeof(cfg().pushUrl) - 1);
      cfg().pushUrl[sizeof(cfg().pushUrl) - 1] = '\0';
      changed = true;
      pushKick();
    }
  }
  if (getParam(body, "period", val, sizeof(val)) && val[0]) {
    long sec = atol(val);
    if (sec < 1) sec = 1;
    if (sec > 3600) sec = 3600;
    uint32_t ms = (uint32_t)sec * 1000UL;
    if (ms != cfg().pushPeriodMs) {
      cfg().pushPeriodMs = ms;
      changed = true;
    }
  }

  bool persisted = changed ? settingsSave() : true;

  char resp[96];
  snprintf(resp, sizeof(resp), "{\"ok\":true,\"persisted\":%s,\"reboot\":%s}",
           persisted ? "true" : "false", reboot ? "true" : "false");
  sendBody(c, 200, "OK", "application/json", resp);

  if (reboot) {
    Serial.println("[cfg] reinicio programado (WiFi cambiado)");
    g_rebootPending = true;
    g_rebootAt = millis() + 1500;
  }
}

// ---------------------------------------------------------------------------
// Enrutador
// ---------------------------------------------------------------------------
static void handleClient(WiFiClient& c) {
  char line[192];
  if (readLine(c, line, sizeof(line)) < 0) { c.stop(); return; }

  // "MÉTODO /ruta HTTP/1.x"
  char method[8] = {0};
  char path[96] = {0};
  int mi = 0, pi = 0;
  const char* p = line;
  while (*p == ' ') p++;
  while (*p && *p != ' ' && mi < (int)sizeof(method) - 1) method[mi++] = *p++;
  while (*p == ' ') p++;
  while (*p && *p != ' ' && *p != '?' && pi < (int)sizeof(path) - 1) path[pi++] = *p++;
  method[mi] = '\0';
  path[pi] = '\0';
  if (!method[0] || !path[0]) { c.stop(); return; }

  // Cabeceras: nos quedamos con Content-Length
  int contentLen = 0;
  for (;;) {
    int n = readLine(c, line, sizeof(line));
    if (n <= 0) break;  // línea vacía = fin de cabeceras (o timeout)
    if (startsWithCI(line, "content-length:")) {
      contentLen = atoi(line + 15);
    }
  }

  if (strcmp(method, "GET") == 0) {
    if (strcmp(path, "/") == 0 || strcmp(path, "/index") == 0) {
      size_t len = strlen(PAGE_HTML);
      sendHeaders(c, 200, "OK", "text/html; charset=utf-8", true, len);
      // Sirve en trozos de 256 B para no saturar el buffer del cliente
      const char* html = PAGE_HTML;
      while (len) {
        size_t n = len > 256 ? 256 : len;
        c.write((const uint8_t*)html, n);
        html += n;
        len -= n;
        delay(0);
      }
    } else if (strcmp(path, "/api/state") == 0) {
      sendState(c);
    } else if (strcmp(path, "/favicon.ico") == 0) {
      sendBody(c, 204, "No Content", "text/plain", "");
    } else {
      sendBody(c, 404, "Not Found", "text/plain", "No encontrado");
    }
  } else if (strcmp(method, "POST") == 0) {
    char body[512];
    int bi = 0;
    if (contentLen > 0) {
      uint32_t t0 = millis();
      while (bi < (int)sizeof(body) - 1 && bi < contentLen &&
             millis() - t0 < 3000) {
        if (c.available()) body[bi++] = (char)c.read();
        else delay(1);
      }
    }
    body[bi] = '\0';

    if (strcmp(path, "/api/config") == 0) {
      handleConfig(c, body);
    } else {
      sendBody(c, 404, "Not Found", "text/plain", "No encontrado");
    }
  } else if (strcmp(method, "OPTIONS") == 0) {
    sendHeaders(c, 204, "No Content", "text/plain", false, 0);
  } else {
    sendBody(c, 405, "Method Not Allowed", "text/plain", "Método no soportado");
  }

  delay(10);       // deja que el socket envíe todo
  c.flush();
  c.stop();
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
void webBegin(WiFiServer* srv, bool apMode) {
  g_srv = srv;
  g_apMode = apMode;
  g_rebootPending = false;
  g_srv->begin();
}

void webLoop() {
  if (g_rebootPending && (int32_t)(millis() - g_rebootAt) >= 0) {
    Serial.println("[sys] reiniciando…");
    delay(100);
    NVIC_SystemReset();
  }
  if (!g_srv) return;
  WiFiClient client = g_srv->available();
  if (client) {
    handleClient(client);
  }
}
