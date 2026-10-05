# Servidor local del sistema de cascos

Este servidor recibe telemetría de los ESP32 mediante WebSocket y ejecuta primero las reglas deterministas de seguridad. La IA local se integrará después sobre los eventos/ventanas de datos; no reemplaza las reglas críticas.

## 1. Instalar Bun

Instala Bun en la computadora que funcionará como servidor y verifica:

```bash
bun --version
```

## 2. Instalar dependencias del proyecto

Desde la raíz del repositorio:

```bash
bun install
```

## 3. Arrancar el servidor

Desde la raíz del repositorio usa directamente:

```bash
bun run server/index.ts
```

Por defecto escucha en `http://localhost:8787`, WebSocket `ws://localhost:8787/ws` y estado `http://localhost:8787/health`.

## 4. Configurar el ESP32

Abre `hardware/esp32_helmet/esp32_helmet.ino` y cambia:

```cpp
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";
const char* SERVER_HOST = "192.168.1.100";
const char* HELMET_ID = "CASCO-001";
```

`SERVER_HOST` debe ser la IPv4 de la computadora donde corre Bun. El ESP32 y la computadora deben estar en la misma red Wi-Fi.

## 5. Bibliotecas de Arduino

Instala desde Library Manager:

- Adafruit MPU6050
- Adafruit Unified Sensor
- WebSockets by Markus Sattler

`WiFi.h` y `Wire.h` vienen con el core de ESP32.

## 6. Primer encendido

Primero arranca el servidor. Después conecta el ESP32 por USB y abre el Serial Monitor a `115200` baudios. Debes ver Wi-Fi conectado, MPU6050 listo y WebSocket conectado.

## 7. Hardware del primer prototipo

MPU6050: VCC → 3.3 V, GND → GND, SDA → GPIO 21, SCL → GPIO 22.

MQ-2: salida analógica → GPIO 34, GND → GND, alimentación según el módulo utilizado.

Buzzer de 9–12 V: NO conectarlo directamente al GPIO. Usa transistor/MOSFET y una alimentación adecuada. GPIO 25 controla la etapa de conmutación.

## Importante sobre MQ-2

El valor `gas` enviado por el firmware es la lectura ADC cruda. No representa directamente ppm de propano o butano. Primero hay que caracterizar y calibrar el sensor real; los umbrales actuales son experimentales.

## Arquitectura

```text
ESP32 + MPU6050 + MQ-2
          |
          | Wi-Fi / WebSocket
          v
    server/index.ts
          |
          +--> reglas de seguridad
          |
          +--> eventos
          |
          +--> futura IA local
          |
          v
      dashboard React
```
