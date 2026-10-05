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

```bash
bun run server
```

Por defecto escucha en:

- HTTP: `http://localhost:8787`
- WebSocket: `ws://localhost:8787/ws`
- Estado: `http://localhost:8787/health`

Desde otra computadora de la misma red puedes comprobar el estado usando la IP de la computadora servidor.

## 4. Configurar el ESP32

Abre:

`hardware/esp32_helmet/esp32_helmet.ino`

Cambia:

```cpp
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";
const char* SERVER_HOST = "192.168.1.100";
const char* HELMET_ID = "CASCO-001";
```

`SERVER_HOST` debe ser la IPv4 de la computadora donde corre Bun, por ejemplo `192.168.1.25`.

El ESP32 y la computadora deben estar conectados a la misma red Wi-Fi.

## 5. Bibliotecas de Arduino

Instala desde el Library Manager:

- Adafruit MPU6050
- Adafruit Unified Sensor
- WebSockets by Markus Sattler

`WiFi.h` y `Wire.h` vienen con el core de ESP32.

## 6. Primer encendido

Primero arranca el servidor en la computadora. Después conecta el ESP32 por USB y abre el Serial Monitor a `115200` baudios.

El ESP32 debería mostrar:

```text
WiFi conectado. IP del ESP32: ...
MPU6050 listo.
WebSocket conectado al servidor.
```

También enviará JSON de telemetría por WebSocket.

## 7. Hardware del primer prototipo

MPU6050:

- VCC → 3.3 V
- GND → GND
- SDA → GPIO 21
- SCL → GPIO 22

MQ-2:

- salida analógica → GPIO 34
- GND → GND
- alimentación según el módulo utilizado

Buzzer de 9–12 V:

- NO conectarlo directamente al GPIO del ESP32.
- Usar transistor/MOSFET y una alimentación adecuada para el buzzer.
- GPIO 25 controla la etapa de conmutación.

## Importante sobre MQ-2

El valor `gas` enviado por el firmware es la lectura ADC cruda. No representa directamente ppm de propano o butano. Primero hay que caracterizar y calibrar el sensor real, por lo que los umbrales actuales son experimentales.

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
