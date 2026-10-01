#pragma once
#include <stdint.h>

// Versión del firmware (aparece en la página y en /api/data)
#define FW_VERSION "0.1.0"

// ---------------------------------------------------------------------------
// WiFi (credenciales por defecto)
// ---------------------------------------------------------------------------
// Si están vacías o fallan la conexión, la placa arranca en modo punto de
// acceso (AP) y puedes guardar tu red desde la página sin re-flashear
// (persiste en EEPROM).
#define WIFI_SSID ""
#define WIFI_PASS ""

#define WIFI_CONNECT_TIMEOUT_MS 15000UL
#define WIFI_RETRY_MS           30000UL

// Modo AP = portal de configuración
#define AP_SSID    "UNO-R4-Setup"
#define AP_PASS    "12345678"   // mínimo 8 caracteres

// ---------------------------------------------------------------------------
// Servidor web embebido en la placa
// ---------------------------------------------------------------------------
#define HTTP_PORT 80

// ---------------------------------------------------------------------------
// Envío opcional de los datos a un endpoint externo (HTTP, sin TLS)
// Vacío = desactivado. Se puede cambiar desde la página (Ajustes).
// P.ej. "http://192.168.1.10:8080/datos"
// ---------------------------------------------------------------------------
#define PUSH_URL_DEFAULT        ""
#define PUSH_PERIOD_DEFAULT_MS  10000UL

// ---------------------------------------------------------------------------
// Identidad
// ---------------------------------------------------------------------------
#define DEVICE_NAME_DEFAULT "UNO-R4 Sensores"
