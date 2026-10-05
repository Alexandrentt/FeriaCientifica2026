# Sistema IoT de seguridad para cascos

## Arquitectura

```
ESP32 + MPU6050 + MQ-2 + buzzer
             |
          Wi-Fi
             |
       Bun / WebSocket
       /     |       \
 reglas   dataset   Telegram
             |
        React dashboard
             |
       futura IA local
```

## 1. Requisitos

- Bun.
- Arduino IDE.
- Core Arduino-ESP32.
- Librerías:
  - Adafruit MPU6050
  - Adafruit Unified Sensor
  - WebSockets by Markus Sattler

## 2. Servidor

Desde la raíz:

```bash
bun install
bun run server/index.ts
```

Comprobar:

```text
http://localhost:8787/health
```

Dashboard, en otra terminal:

```bash
bun run dev
```

Servidor:
- HTTP: 8787
- WebSocket: ws://IP-DE-LA-PC:8787/ws
- Dataset: server/data/helmet_dataset.jsonl

## 3. Telegram

Crea un bot con @BotFather y obtén el token y el chat ID.

Crea `.env` en la raíz:

```env
TELEGRAM_BOT_TOKEN=TU_TOKEN
TELEGRAM_CHAT_ID=TU_CHAT_ID
PORT=8787
```

No subas estas credenciales a GitHub. Reinicia el servidor después de modificarlas.

## 4. Cargar el ESP32

Archivo:

```text
hardware/esp32_helmet/esp32_helmet.ino
```

En Arduino IDE:

1. Selecciona la placa ESP32.
2. Selecciona el puerto COM.
3. Instala las librerías indicadas.
4. Compila.
5. Sube.
6. Serial Monitor a 115200.

### Primera configuración

El ESP32 crea:

```text
CASCO-SETUP
```

Conéctate y abre:

```text
http://192.168.4.1
```

Introduce:
- SSID.
- Contraseña.
- IP de la computadora que ejecuta Bun.
- Puerto 8787.
- ID, por ejemplo CASCO-001.

La configuración se guarda con Preferences/NVS. No hay que recompilar para cambiar estos valores.

## 5. Cableado

### MPU6050

```text
MPU6050       ESP32
VCC     --->   3V3
GND     --->   GND
SDA     --->   GPIO21
SCL     --->   GPIO22
```

El MPU6050 ya contiene acelerómetro y giroscopio.

### MQ-2

GPIO34 es ADC1 y entrada solamente. El firmware lo usa como entrada analógica.

```text
MQ-2 AO  ---> GPIO34
MQ-2 GND ---> GND
MQ-2 VCC ---> alimentación según el módulo
```

**No conectes AO a ciegas.** Muchos módulos MQ-2 trabajan con 5 V y la salida analógica puede superar el nivel seguro de entrada del ESP32. Verifica el módulo y mide AO; si puede superar el rango seguro, usa un divisor de tensión. GPIO34 es una entrada ADC, no una salida.

### Buzzer 9–12 V

**Nunca conectarlo directamente al GPIO25.**

```text
                 +9/12 V
                    |
                  BUZZER
                    |
                 MOSFET
                    |
                   GND

GPIO25 -- resistencia -- GATE
ESP32 GND ------------- GND
```

GPIO25 solamente controla la etapa de potencia.

## 6. Alarma local del casco

Las alarmas críticas se ejecutan dentro del ESP32 para que el aviso no dependa de Wi-Fi, Bun, Telegram ni IA.

Umbrales iniciales:

- MQ-2 >= 700: alarma crítica.
- MQ-2 >= 520: aviso preventivo.
- aceleración >= 22 m/s²: impacto.
- giroscopio >= 280 °/s: impacto.
- después de impacto + baja actividad ~1.2 s: posible caída.

El buzzer es **no bloqueante**: usa `millis()` y el ESP32 puede emitir el patrón mientras sigue leyendo sensores y enviando telemetría a 5 Hz.

El servidor también vuelve a evaluar las señales con una ventana temporal. La IA futura será complementaria, no el único mecanismo de alarma.

## 7. Dataset

Se guarda en:

```text
server/data/helmet_dataset.jsonl
```

No se sube a GitHub.

Las muestras incluyen acelerómetro, giroscopio, MQ-2, batería, casco, timestamp, etiqueta, fuente y `windowId`.

Generar 10 000 muestras:

```bash
bun run server/generateSyntheticDataset.ts 10000
```

Generar 100 000:

```bash
bun run server/generateSyntheticDataset.ts 100000
```

Las muestras sintéticas se agrupan en ventanas de 10 s a 5 Hz y contienen secuencias de NORMAL, WALKING, IMPACT, POSSIBLE_FALL, GAS_WARNING y GAS_CRITICAL.

## 8. Simulador

El simulador del dashboard usa el mismo pipeline cuando el servidor está conectado:

```text
Dashboard
   |
   | source: synthetic
   v
Bun
   |
   +--> reglas
   +--> dataset
   +--> Telegram
   +--> dashboard
```

Por tanto, los datos de las pruebas del dashboard pueden terminar en el mismo JSONL que los datos reales.

## 9. Prueba completa

Terminal 1:

```bash
bun run server/index.ts
```

Terminal 2:

```bash
bun run dev
```

Luego:

1. Configura Telegram.
2. Carga el firmware.
3. Conecta el ESP32 a `CASCO-SETUP`.
4. Configura Wi-Fi, IP del servidor, puerto e ID.
5. Comprueba `WebSocket conectado al servidor.` en Serial Monitor.
6. Abre el dashboard.
7. Prueba el simulador.
8. Revisa `server/data/helmet_dataset.jsonl`.
9. Comprueba Telegram.
10. Calibra los umbrales con sensores reales antes de presentar resultados.

## 10. Advertencias

- No buzzer 9–12 V directo al GPIO25.
- No señales de 5 V directamente a GPIO del ESP32.
- No conectar AO del MQ-2 sin verificar su tensión.
- No poner el token de Telegram en GitHub.
- El ESP32 debe usar la IP LAN de la computadora, no `localhost`.
- MQ-2 entrega una señal experimental; no debe presentarse como instrumento certificado de ppm.
- La IA no debe ser el único mecanismo de alarma.

## 11. IA futura

```text
sensores
   |
reglas deterministas
   |
ventana temporal
   |
ML / IA local
   |
clasificación + confianza + explicación
   |
dashboard + Telegram
```
