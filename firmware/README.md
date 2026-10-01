# Panel de sensores — Arduino UNO R4 WiFi

Firmware para **Arduino UNO R4 WiFi** (RA4M1 + módulo ESP32-S3-MINI-1) con:

- **Página web embebida en la placa** (dashboard en vivo, se actualiza cada 2 s).
- **WiFi STA + punto de acceso de respaldo**: si no hay credenciales o falla la
  conexión, la placa crea la red `UNO-R4-Setup` (clave `12345678`) para
  configurar el WiFi **desde la propia página, sin re-flashear**.
- **API JSON** en `/api/state` (lectura) y `/api/config` (escritura).
- **Envío opcional** de los datos por HTTP POST a un endpoint externo.
- **Ajustes persistentes en EEPROM** (8 KB disponibles; usa ~224 B).
- **Capa de sensores extensible**: la tabla de canales está en `src/sensors.cpp`.

> Nota: en esta placa **no se programa el ESP32-S3 directamente**. El S3 lleva el
> firmware WiFi de fábrica y se controla desde el RA4M1 con la librería
> `WiFiS3` (incluida en el core). Todo este código corre en el RA4M1.

---

## 1. Compilar y flashear

Requisitos: [PlatformIO Core](https://platformio.org/install/cli)
(`pip install platformio`) o el plugin PlatformIO para VS Code.

```bash
cd firmware

pio run                 # compilar
pio run -t upload       # flashear (placa conectada por USB-C)
pio device monitor      # monitor serie a 115200 baud
```

Salida esperada (compilación verificada):

```
RAM:   [==        ]  17.1% (used 5592 bytes from 32768 bytes)
Flash: [===       ]  29.6% (used 77500 bytes from 262144 bytes)
========================= [SUCCESS] =========================
```

Si la placa no aparece en el puerto serie, instala el driver CH340/UF2 según tu SO.

## 2. Puesta en marcha

1. **Opcional — WiFi fijo:** edita `include/config.h` y rellena `WIFI_SSID` /
   `WIFI_PASS`. Si lo dejas vacío, pasa al paso 2.
2. Flashea y abre el monitor serie: verás la IP asignada.
3. Abre `http://<IP>` en el navegador → dashboard en vivo.
4. **Si no conecta**, únete a la red `UNO-R4-Setup` (clave `12345678`), abre
   `http://192.168.4.1` (la IP aparece en el monitor serie), rellena SSID y
   contraseña en *Ajustes* y guarda: la placa guarda en EEPROM y se reinicia.
5. Los LEDs: **lento** = STA conectado · **rápido** = modo AP ·
   **muy rápido** = reconectando.

## 3. Añadir tus sensores (lo pendiente)

Todo ocurre en **`src/sensors.cpp`**, en la tabla `g_channels[]`. Cada entrada:

```cpp
{ id,  nombre_en_página,  unidad,  etiqueta_pin,  tipo,  pin,  pin2,  pullup,  activo,  periodo_ms, 0, false, 0 }
```

Ejemplos ya incluidos (puedes borrarlos): potenciómetro en A0, botón en D2
(con pull-up), HC-SR04 en D3/D4.

| Tipo (`ChanType`) | Uso | Pin |
|---|---|---|
| `CH_ANALOG` | LDR, MQ-2, humedad de suelo, potenciómetro… | `A0`–`A5` |
| `CH_DIGITAL` | PIR, flama, reed, pulsador… (`pullup=true` si el sensor pide resistencia interna) | D0–D13 |
| `CH_ULTRASONIC` | HC-SR04 (pin=Trigger, pin2=Echo), devuelve cm | D3/D4 |
| `CH_RSSI` / `CH_UPTIME` | canales internos, ya activos | — |

**Pines libres del UNO R4 WiFi:** D0–D13, A0–A5 (evita D0/D1 = RX/TX del
monitor serie). I2C: **A4=SDA, A5=SCL**. SPI: D11=MOSI, D12=MISO, D13=SCK, D10=CS.
Alimentación: **5 V** y **3V3** en el header. Los pines del RA4M1 son 5 V; si
tu sensor es sólo 3.3 V, revisa su hoja de datos antes de conectarlo.

### Sensor de un tipo nuevo (I2C, SPI, 1-wire…)

1. Añade un `ChanType` en `include/sensors.h` (p. ej. `CH_I2C`).
2. Inicializa el bus en `sensorsBegin()` y lee el valor en `sample()`
   en `src/sensors.cpp`.
3. Si necesitas una librería, añádela a `lib_deps` en `platformio.ini`:

```ini
lib_deps =
    adafruit/Adafruit Unified Sensor@^1.1.14
    adafruit/Adafruit BME280 Library@^2.2.4
```

La página y la API **no necesitan cambios**: muestran cualquier canal que
aparezca en la tabla.

## 4. API de la placa

### `GET /api/state`

Estado completo (también lo usa la página). Ejemplo:

```json
{
  "fw": "0.1.0",
  "device": "UNO-R4 Sensores",
  "mode": "sta",
  "ip": "192.168.1.42",
  "ssid": "MiWifi",
  "rssi": -52,
  "uptime": 128,
  "cfg": {"name": "UNO-R4 Sensores", "push": "", "period": 10000},
  "channels": [
    {"id": "pot", "name": "Ejemplo: potenciómetro / analógico en A0",
     "unit": "raw", "pin": "A0", "type": "analog", "dec": 0,
     "value": 512.0, "valid": true}
  ]
}
```

### `POST /api/config`

`Content-Type: application/x-www-form-urlencoded`. Campos (todos opcionales):

| Campo | Efecto |
|---|---|
| `name` | Nombre del dispositivo |
| `ssid` | Nueva red WiFi → **reinicia** la placa |
| `pass` | Nueva contraseña WiFi → **reinicia** la placa |
| `push` | URL `http://host:puerto/ruta`; vacío = desactivar |
| `period` | Periodo de envío en **segundos** (1–3600) |

Respuesta: `{"ok":true,"persisted":true,"reboot":false}`.

### Envío a un endpoint externo (`push`)

Si rellenas *Endpoint de envío* (o `PUSH_URL_DEFAULT`), la placa manda cada
N segundos:

```http
POST /ruta HTTP/1.1
Content-Type: application/json

{"fw":"0.1.0","device":"UNO-R4 Sensores","uptime":128,"values":{"pot":512.0,"wifi":-52.0}}
```

Sólo `http://` (el RA4M1 no tiene TLS). Puede apuntar a un servidor propio,
n8n, Node-RED, ThingSpeak con proxy, etc.

## 5. Estructura

```
firmware/
├── platformio.ini          # entorno: platform renesas-ra, board uno_r4_wifi
├── include/
│   ├── config.h            # WiFi, AP, periodos, endpoint (edita aquí)
│   ├── settings.h          # ajustes persistentes (EEPROM)
│   ├── sensors.h           # tipos y struct de canales
│   ├── web_server.h        # servidor web
│   ├── push.h              # envío a endpoint externo
│   ├── page_html.h         # página web embebida (dashboard)
│   └── jsonutil.h          # escape/formato JSON sin depender de %f
└── src/
    ├── main.cpp            # arranque, WiFi STA/AP, loop
    ├── settings.cpp        # carga/guarda EEPROM
    ├── sensors.cpp         # ← TABLA DE TUS SENSORES + muestreo
    ├── web_server.cpp      # rutas /, /api/state, /api/config
    └── push.cpp            # POST JSON periódico
```

## 6. Límites conocidos

- Sin TLS: el envío externo es sólo `http://`.
- Un cliente HTTP a la vez (suficiente para un panel de monitorización).
- La conexión WiFi se reintenta cada 30 s; durante el reintento la página
  puede fallar un instante (la propia página lo detecta y lo muestra).
