# EPI 4.0 — Servidor de telemetría

El servidor recibe datos del **Arduino UNO R4 WiFi** por UDP, procesa reglas de seguridad, guarda muestras y retransmite telemetría al Dashboard por WebSocket.

## Puertos

| Servicio | Puerto |
|---|---:|
| Dashboard/Vite | 5173 (normalmente) |
| HTTP Bun | 8787 |
| WebSocket Bun | 8787/ws |
| UDP Arduino | 5005 |

## Arrancar

Desde la raíz:

```bash
bun install
bun run server/index.ts
```

Debe aparecer:

```
Helmet telemetry server running at http://localhost:8787
WebSocket endpoint: ws://localhost:8787/ws
UDP telemetry listening on 0.0.0.0:5005
```

En otra terminal:

```bash
bun run dev
```

Health check:

```
http://localhost:8787/health
```

## Variables de entorno

En la raíz:

```env
PORT=8787
UDP_PORT=5005
HELMET_ID=CASCO-001
TELEGRAM_BOT_TOKEN=TU_TOKEN
TELEGRAM_CHAT_ID=TU_CHAT_ID
```

Nunca subas el token de Telegram a GitHub.

## UDP del Arduino

El Arduino envía:

```
gas,ax,ay,az,gx,gy,gz
```

Ejemplo:

```
65,0.12,-0.05,9.81,0.01,0.00,0.02
```

El servidor convierte el giroscopio de rad/s a °/s porque la librería Adafruit MPU6050 entrega esa magnitud en rad/s.

El paquete UDP no contiene batería, por lo que actualmente se asigna temporalmente `battery: 100`.

## Reglas

Umbrales iniciales:

- gas >= 520 → advertencia;
- gas >= 700 → crítico;
- aceleración >= 22 m/s² → impacto;
- giroscopio >= 280 °/s → impacto;
- impacto + baja actividad → posible caída;
- sin telemetría durante 5 s → desconexión.

Estos valores son experimentales y deben calibrarse.

## Telegram

Las alertas generadas por el servidor se envían automáticamente mediante el bot configurado en `.env`.

Existe un cooldown para evitar una tormenta de mensajes cuando un sensor permanece por encima del umbral.

## Dataset

Las muestras se escriben en:

```
server/data/helmet_dataset.jsonl
```

No se deben subir credenciales ni datos locales de prueba a GitHub.

Generación sintética:

```bash
bun run server/generateSyntheticDataset.ts 10000
```

## Firmware

Firmware real:

```
hardware/arduino_r4_wifi/arduino_r4_wifi.ino
```

Firmware de simulación:

```
hardware/arduino_r4_wifi/arduino_r4_wifi_simulacion.ino
```

La documentación completa de red, Arduino IDE, firewall, cableado, Dashboard, Telegram y pruebas está en el [README principal](../README.md).

## Seguridad

- No usar `localhost` como IP destino en el Arduino.
- PC y Arduino deben estar en la misma red.
- Permitir UDP 5005 en el firewall si es necesario.
- No poner contraseñas reales en sketches públicos.
- No conectar un buzzer de potencia directamente a un GPIO.
- No asumir que el AO de un MQ-2 es seguro para una entrada analógica sin verificar su tensión.
- La IA futura no reemplaza las reglas deterministas de seguridad.
