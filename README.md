## Overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY THESE AUTH FILES: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`. Extend that page
for the product's authenticated experience, and reuse `RequireAuth` when adding
another protected route — do NOT hand-roll a redirect to `/auth`, since landing
on a bare sign-in form with no explanation of what was blocked is confusing.

`RequireAuth` states the block on the page the visitor asked for and sends them
to `/auth?returnTo=<current route>` when they choose to sign in, so they come
back to it. Pass `title` and `description` to say what the page is:

```tsx
<Route
  path="/dashboard"
  element={
    <RequireAuth
      title="Sign in to view your dashboard"
      description="Your projects and settings live here."
    >
      <Dashboard />
    </RequireAuth>
  }
/>
```

Pass `redirectImmediately` for a route where bouncing straight to `/auth` really
is better.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.


# EPI 4.0 — Casco de seguridad inteligente

## Arquitectura real de la demostración

El prototipo actual usa **Arduino UNO R4 WiFi (WiFiS3)**, no ESP32.

```
Arduino UNO R4 WiFi
  ├─ MPU6050
  ├─ MQ-2
  └─ Buzzer
       │
       │ UDP :5005
       ▼
PC / Bun
  ├─ reglas de seguridad
  ├─ dataset JSONL
  ├─ Telegram
  └─ WebSocket :8787
       │
       ▼
Dashboard React
  ├─ telemetría en tiempo real
  ├─ vista 3D
  ├─ alertas
  ├─ voz
  └─ respuesta automática simulada
```

## 1. Preparar la PC

Requisitos:

- Bun.
- Arduino IDE.
- Arduino UNO R4 WiFi.
- PC y Arduino conectados al **mismo hotspot del teléfono**.

Instalar dependencias del proyecto:

```bash
bun install
```

## 2. Configurar el servidor

En la raíz del proyecto:

```bash
bun run server/index.ts
```

El servidor usa:

- HTTP: `8787`
- WebSocket: `8787/ws`
- UDP de sensores: `5005`

Debe aparecer algo parecido a:

```
Helmet telemetry server running at http://localhost:8787
WebSocket endpoint: ws://localhost:8787/ws
UDP telemetry listening on 0.0.0.0:5005
```

Comprobar desde la PC:

```
http://localhost:8787/health
```

## 3. Averiguar la IP de la PC

La IP que se pone en el Arduino es la **IP de la PC dentro del hotspot del teléfono**.

En Windows:

```powershell
ipconfig
```

Busca el adaptador Wi-Fi conectado al hotspot y su **IPv4**.

Ejemplo:

```
10.156.133.12
```

No uses `localhost` en el Arduino.

## 4. Configurar el firewall de Windows

El servidor recibe datos UDP por el puerto `5005`.

Si Windows Firewall bloquea la comunicación, crea una regla de entrada para:

```
UDP 5005
```

También permite Bun en la red privada cuando Windows lo solicite.

Para la demostración, PC y Arduino deben estar en la misma red del teléfono.

## 5. Código del Arduino UNO R4 WiFi

El firmware está en:

```
hardware/arduino_r4_wifi/arduino_r4_wifi.ino
```

Hay también un firmware de respaldo:

```
hardware/arduino_r4_wifi/arduino_r4_wifi_simulacion.ino
```

### Firmware real

Usa:

- MPU6050 en tiempo real.
- MQ-2 en A0.
- Buzzer en D8.
- WiFiS3.
- UDP hacia la PC.
- Frecuencia aproximada: 6–7 muestras/segundo.

Antes de cargarlo, cambia:

```cpp
char ssid[] = "TU_HOTSPOT";
char pass[] = "TU_PASSWORD";
IPAddress pcIP(192, 168, 1, 100);
```

por los datos reales de tu red.

**No subas contraseñas reales a GitHub.**

### Firmware de simulación

```
hardware/arduino_r4_wifi/arduino_r4_wifi_simulacion.ino
```

Este permite probar toda la cadena aunque los sensores no estén conectados.

Envía:

```
gas,ax,ay,az,gx,gy,gz
```

cada 200 ms.

## 6. Librerías del Arduino IDE

Para el firmware real instala:

- Adafruit MPU6050
- Adafruit Unified Sensor

El soporte WiFiS3 viene con el core de Arduino UNO R4 WiFi.

Selecciona:

```
Tools → Board → Arduino UNO R4 Boards → Arduino UNO R4 WiFi
```

Después selecciona el puerto COM correcto y carga el sketch.

Serial Monitor:

```
115200 baud
```

## 7. Flujo de datos Arduino → Dashboard

El Arduino envía por UDP una línea como:

```
65,0.12,-0.05,9.81,0.01,0.00,0.02
```

El servidor Bun:

1. recibe el paquete UDP en el puerto 5005;
2. interpreta los siete valores;
3. convierte el giroscopio de rad/s a °/s;
4. agrega timestamp;
5. asigna el casco `CASCO-001`;
6. evalúa las reglas de seguridad;
7. guarda la muestra en el dataset;
8. envía telemetría al Dashboard por WebSocket;
9. envía Telegram cuando corresponde.

La batería todavía **no viene del Arduino**, por lo que el servidor muestra temporalmente 100 %. Cuando agreguemos medición de batería, reemplazaremos ese valor.

## 8. Dashboard

En otra terminal:

```bash
bun run dev
```

Abre la dirección que indique Vite.

El Dashboard muestra:

- estado de cada casco;
- aceleración;
- giroscopio;
- MQ-2;
- batería;
- alertas recientes;
- casco 3D;
- módulos del casco;
- voz de alertas;
- simulación de emergencia.

### Voz

Al abrir el Dashboard pulsa una vez:

**Activar voz**

Después de esa activación, las alertas pueden anunciarse automáticamente.

Ejemplo:

> Posible caída detectada. Verificar al trabajador y activar el protocolo de emergencia.

## 9. Alertas automáticas

Las reglas actuales del servidor son experimentales:

- MQ-2 >= 520 → advertencia.
- MQ-2 >= 700 → gas crítico.
- aceleración >= 22 m/s² → impacto.
- giroscopio >= 280 °/s → impacto.
- impacto seguido de baja actividad → posible caída.
- sin telemetría durante aproximadamente 5 s → casco desconectado.

Las alertas críticas se procesan automáticamente.

Flujo:

```
sensor
  ↓
Arduino
  ↓
UDP
  ↓
Bun
  ↓
reglas de seguridad
  ├── Dashboard
  ├── voz
  ├── Telegram
  └── respuesta de emergencia simulada
```

La IA futura será complementaria. Las reglas deterministas continúan siendo la primera barrera de seguridad.

## 10. Telegram

Crea un bot con BotFather.

Obtén:

- token del bot;
- chat ID.

En la raíz crea un archivo `.env`:

```env
TELEGRAM_BOT_TOKEN=TU_TOKEN
TELEGRAM_CHAT_ID=TU_CHAT_ID
PORT=8787
UDP_PORT=5005
HELMET_ID=CASCO-001
```

Nunca publiques este archivo ni el token.

Reinicia:

```bash
bun run server/index.ts
```

Cuando se detecte una alerta, el servidor enviará automáticamente la notificación a Telegram.

## 11. Respuesta automática de emergencia

En el Dashboard, una alerta crítica de:

- posible caída;
- gas crítico;

activa automáticamente la respuesta de demostración.

El Dashboard:

1. muestra la alerta;
2. reproduce la alerta por voz si la voz fue activada;
3. muestra la solicitud de emergencia;
4. mantiene el evento visible.

**No se realiza una llamada telefónica real.**

Para una llamada real habría que integrar posteriormente un proveedor de telefonía y definir un protocolo de confirmación. No se debe conectar una llamada real accidentalmente durante la feria.

## 12. Cableado

### MPU6050

```
MPU6050       UNO R4 WiFi
VCC      →    3.3V
GND      →    GND
SDA      →    SDA
SCL      →    SCL
```

### MQ-2

```
MQ-2 AO   →   A0
MQ-2 GND  →   GND
MQ-2 VCC  →   alimentación adecuada del módulo
```

**Importante:** verifica la tensión de AO del módulo MQ-2. No asumas que una salida de 5 V es segura para A0.

### Buzzer

El código actual usa D8.

Si el buzzer necesita más tensión/corriente que la que puede entregar el Arduino:

```
D8 → resistencia → transistor/MOSFET → buzzer → fuente externa
```

No alimentes un buzzer de potencia directamente desde el pin.

## 13. Prueba recomendada

Hazlo en este orden:

### Prueba A — servidor

```bash
bun run server/index.ts
```

Verifica:

```
http://localhost:8787/health
```

### Prueba B — Dashboard

```bash
bun run dev
```

Abre Dashboard y verifica que indique servidor conectado.

### Prueba C — Arduino simulado

Carga:

```
arduino_r4_wifi_simulacion.ino
```

Verifica en el Dashboard que cambien los valores de telemetría.

### Prueba D — sensores reales

Carga:

```
arduino_r4_wifi.ino
```

Mueve el MPU6050 y verifica que cambien aceleración y giroscopio.

Acerca una fuente controlada de prueba al MQ-2 y verifica la lectura. No uses gases peligrosos para provocar una alarma.

### Prueba E — alerta

Usa primero el simulador del Dashboard para comprobar:

- voz;
- alerta visual;
- Telegram;
- respuesta automática de demostración.

Después calibra los umbrales con los sensores reales.

## 14. Dataset

Las muestras reales y sintéticas se guardan localmente en:

```
server/data/helmet_dataset.jsonl
```

El archivo está pensado para permanecer fuera de GitHub.

Generar datos sintéticos:

```bash
bun run server/generateSyntheticDataset.ts 10000
```

## 15. Problemas frecuentes

### El Arduino conecta al teléfono pero el Dashboard no recibe datos

Comprueba:

1. PC y Arduino están en el mismo hotspot.
2. `pcIP` coincide con la IPv4 de la PC.
3. UDP 5005 no está bloqueado por Firewall.
4. Bun muestra `UDP telemetry listening on 0.0.0.0:5005`.
5. El Dashboard está conectado al WebSocket 8787.

### El Dashboard dice "Modo demostración"

El servidor WebSocket no está conectado.

Ejecuta:

```bash
bun run server/index.ts
```

y recarga el Dashboard.

### El MPU6050 no aparece

El firmware no se detiene: utiliza valores de respaldo para acelerómetro/giroscopio y muestra el problema por Serial.

Revisa alimentación, GND, SDA y SCL.

### Telegram no llega

Revisa:

- token;
- chat ID;
- que el bot haya recibido al menos un mensaje;
- variables de `.env`;
- reinicio del servidor.

## 16. Estado actual del prototipo

La integración actual ya contempla:

- Arduino UNO R4 WiFi;
- MPU6050;
- MQ-2;
- buzzer local;
- UDP;
- servidor Bun;
- WebSocket;
- Dashboard React;
- visualización 3D;
- dataset;
- Telegram;
- alertas por voz;
- respuesta automática simulada.

Pendiente antes de presentar resultados como mediciones reales:

- calibrar MQ-2;
- calibrar umbrales de impacto/caída;
- añadir medición real de batería;
- probar estabilidad Wi-Fi;
- probar el sistema completo con el hardware físico;
- ejecutar `bun run build` y la prueba final en la PC que se usará en la feria.
