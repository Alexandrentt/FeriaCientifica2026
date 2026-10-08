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


# EPI 4.0 — Sistema de monitoreo inteligente

## Arquitectura de la demostración

El prototipo utiliza **Arduino UNO R4 WiFi**, sensores físicos y un servidor local en la PC.

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
  └─ WebSocket :8787
       │
       ▼
Dashboard React
  ├─ telemetría en tiempo real
  ├─ vista 3D
  ├─ alertas
  ├─ voz
  └─ respuesta de emergencia simulada
```

**Importante:** para la feria, el flujo principal es **local**. El Arduino no se conecta directamente a Vercel. El Arduino envía los datos a la PC mediante UDP y la PC los entrega al Dashboard mediante WebSocket.

---

## 1. Qué necesitas

En la PC:

- **Git**
- **Bun**
- **Arduino IDE**
- **Arduino UNO R4 WiFi**

Para la prueba física:

- Arduino UNO R4 WiFi
- MPU6050
- MQ-2
- buzzer activo
- cable USB del Arduino
- teléfono usado como hotspot Wi-Fi

La **PC y el Arduino deben estar conectados al mismo hotspot del teléfono**.

---

## 2. Descargar y preparar el proyecto

Si todavía no tienes el proyecto en la PC:

```powershell
cd $HOME\Desktop
git clone https://github.com/Alexandrentt/FeriaCientifica2026.git
cd FeriaCientifica2026
```

Instala las dependencias:

```powershell
bun install
```

Si ya tienes el proyecto, simplemente entra en su carpeta y ejecuta:

```powershell
git pull origin main
bun install
```

---

## 3. Levantar primero el servidor

Abre una terminal de PowerShell en la carpeta del proyecto.

Ejecuta:

```powershell
bun run server/index.ts
```

**No cierres esta terminal.** El servidor debe permanecer ejecutándose durante la demostración.

Debe mostrar algo similar a:

```
Helmet telemetry server running at http://localhost:8787
WebSocket endpoint: ws://localhost:8787/ws
UDP telemetry listening on 0.0.0.0:5005
```

Comprueba que funciona abriendo en el navegador:

```
http://localhost:8787/health
```

Si responde correctamente, la PC ya está preparada para recibir los datos del Arduino.

### Puertos utilizados

| Función | Puerto |
|---|---:|
| Servidor HTTP | 8787 |
| Dashboard WebSocket | 8787 |
| Telemetría Arduino → PC | UDP 5005 |

---

## 4. Averiguar la IP que debes poner en el Arduino

El Arduino necesita conocer la **IP de la PC dentro del hotspot del teléfono**.

En PowerShell:

```powershell
ipconfig
```

Busca el adaptador Wi-Fi que está conectado al hotspot y localiza:

```
IPv4 Address
```

Por ejemplo:

```
10.156.133.12
```

Esa es la IP que debes colocar en el código del Arduino.

**No pongas `localhost` ni `127.0.0.1` en el Arduino.** Esas direcciones significan "el propio Arduino", no la PC.

---

# 5. Configurar Arduino IDE desde cero

Esta es la parte que debes seguir cuando vayas a cargar el programa al Arduino.

## 5.1 Instalar Arduino IDE

Instala Arduino IDE y ábrelo.

Conecta el **Arduino UNO R4 WiFi** mediante USB.

---

## 5.2 Seleccionar la placa

En Arduino IDE ve a:

```
Tools → Board → Arduino UNO R4 Boards → Arduino UNO R4 WiFi
```

Si **Arduino UNO R4 WiFi** no aparece, instala primero el paquete:

```
Tools → Board → Boards Manager
```

Busca:

```
Arduino UNO R4 Boards
```

Instálalo y vuelve a seleccionar:

```
Arduino UNO R4 WiFi
```

---

## 5.3 Seleccionar el puerto

Con el Arduino conectado:

```
Tools → Port
```

Selecciona el puerto COM que corresponda al **Arduino UNO R4 WiFi**.

Si aparecen varios puertos, desconecta el Arduino, mira cuál desaparece y vuelve a conectarlo. Ese es el puerto que debes seleccionar.

---

## 5.4 Instalar las librerías de los sensores

Ve a:

```
Sketch → Include Library → Manage Libraries
```

Busca e instala estas dos librerías:

1. **Adafruit MPU6050**
2. **Adafruit Unified Sensor**

No necesitas instalar `WiFiS3` desde Library Manager: viene con el soporte de la placa **UNO R4 WiFi**.

El código también utiliza:

- `Wire`
- `WiFiS3`
- `WiFiUdp`

Estas forman parte del entorno/soporte de la placa.

---

# 6. Qué código debes cargar al Arduino

Hay dos programas en el proyecto.

### Para el hardware real

Abre:

```
hardware/arduino_r4_wifi/arduino_r4_wifi.ino
```

Este es el que debes utilizar para la demostración con:

- MPU6050
- MQ-2
- buzzer
- Wi-Fi
- transmisión UDP

### Para probar solamente la comunicación

Abre:

```
hardware/arduino_r4_wifi/arduino_r4_wifi_simulacion.ino
```

Este segundo programa genera valores ficticios y sirve para comprobar que:

```
Arduino → Wi-Fi → UDP → Bun → WebSocket → Dashboard
```

funciona aunque todavía no tengas conectados los sensores.

---

# 7. Antes de cargar el código real

Dentro de:

```
arduino_r4_wifi.ino
```

encontrarás estas líneas:

```cpp
char ssid[] = "TU_HOTSPOT";
char pass[] = "TU_PASSWORD";

IPAddress pcIP(192, 168, 1, 100);
unsigned int pcPort = 5005;
```

Cámbialas **solamente en tu copia local del Arduino IDE**.

Por ejemplo:

```cpp
char ssid[] = "NOMBRE_DE_TU_HOTSPOT";
char pass[] = "CONTRASEÑA_DE_TU_HOTSPOT";

IPAddress pcIP(10, 156, 133, 12);
unsigned int pcPort = 5005;
```

Donde:

- `ssid` = nombre del hotspot del teléfono.
- `pass` = contraseña del hotspot.
- `pcIP` = IPv4 de la PC obtenida con `ipconfig`.
- `pcPort` = debe permanecer en **5005**.

**No cambies el formato del mensaje ni los pines del programa si estás utilizando el montaje actual.**

---

# 8. Subir ("inyectar") el programa al Arduino

En Arduino IDE:

1. Abre `arduino_r4_wifi.ino`.
2. Configura la placa **Arduino UNO R4 WiFi**.
3. Selecciona el puerto COM correcto.
4. Instala las librerías indicadas arriba.
5. Modifica `ssid`, `pass` y `pcIP`.
6. Guarda el sketch.
7. Pulsa **Verify** ✓ para compilar.
8. Si no aparecen errores, pulsa **Upload** →.
9. Espera a que Arduino IDE indique que la carga terminó correctamente.

Ese proceso de **Upload** es lo que "inyecta" el firmware en la memoria del Arduino.

Después puedes abrir:

```
Tools → Serial Monitor
```

y seleccionar:

```
115200 baud
```

Al arrancar deberías poder comprobar la conexión Wi-Fi y la actividad del Arduino.

---

# 9. Qué hace exactamente el Arduino

El programa realiza este ciclo:

```
MPU6050 ─┐
         ├─→ Arduino UNO R4 WiFi ─→ UDP :5005 ─→ PC
MQ-2 ────┤
         │
Buzzer ←─┘
```

El Arduino:

1. lee aceleración del MPU6050;
2. lee velocidad angular del MPU6050;
3. lee el MQ-2 por `A0`;
4. activa el buzzer local cuando el gas supera el umbral configurado;
5. empaqueta los datos;
6. los envía por Wi-Fi a la PC;
7. repite el proceso aproximadamente cada 150 ms.

El mensaje enviado tiene este formato:

```
gas,ax,ay,az,gx,gy,gz
```

Ejemplo:

```
65,0.12,-0.05,9.81,0.01,0.00,0.02
```

---

# 10. Cableado

## MPU6050

```
MPU6050       UNO R4 WiFi
VCC      →    3.3V
GND      →    GND
SDA      →    SDA
SCL      →    SCL
```

## MQ-2

```
MQ-2 AO   →   A0
MQ-2 GND  →   GND
MQ-2 VCC  →   alimentación adecuada del módulo
```

**Importante:** comprueba la tensión de salida AO de tu módulo MQ-2 antes de conectarlo al Arduino.

## Buzzer

El programa utiliza:

```
D8
```

Si el buzzer requiere más corriente o tensión que la que puede entregar el Arduino, utiliza un transistor/MOSFET y una fuente adecuada. No conectes un buzzer de potencia directamente al GPIO.

---

# 11. Firewall de Windows

El Arduino envía datos a la PC mediante **UDP 5005**.

Si Windows bloquea la comunicación, abre PowerShell como administrador y ejecuta:

```powershell
New-NetFirewallRule -DisplayName "EPI 4.0 UDP 5005" -Direction Inbound -Protocol UDP -LocalPort 5005 -Action Allow
```

Cuando Windows pregunte si Bun puede comunicarse en una red privada, permite la comunicación.

---

# 12. Levantar el Dashboard

Con el servidor Bun todavía ejecutándose, abre **otra terminal**.

Entra nuevamente a la carpeta del proyecto:

```powershell
cd $HOME\Desktop\FeriaCientifica2026
```

Ejecuta:

```powershell
bun run dev
```

Vite mostrará una dirección parecida a:

```
http://localhost:5173/
```

Ábrela en el navegador.

El flujo completo queda:

```
┌─────────────────────┐
│ Arduino UNO R4 WiFi │
│ MPU6050 / MQ-2      │
│ Buzzer              │
└──────────┬──────────┘
           │ UDP 5005
           ▼
┌─────────────────────┐
│ PC                  │
│ Bun                  │
│ reglas de seguridad │
└──────────┬──────────┘
           │ WebSocket 8787
           ▼
┌─────────────────────┐
│ Dashboard EPI 4.0   │
│ 3D / alertas / voz  │
└─────────────────────┘
```

---

# 13. Orden correcto para encender todo en la feria

Para evitar problemas, utiliza siempre este orden:

### 1. Enciende el hotspot del teléfono

El nombre y contraseña deben ser los mismos configurados en el Arduino.

### 2. Conecta la PC al hotspot

Comprueba la IP con:

```powershell
ipconfig
```

Si la IP cambió, actualiza `pcIP` en el Arduino y vuelve a cargar el sketch.

### 3. Levanta Bun

```powershell
bun run server/index.ts
```

### 4. Levanta el Dashboard

En otra terminal:

```powershell
bun run dev
```

### 5. Conecta el Arduino por USB

El USB proporciona alimentación y permite cargar/monitorizar el programa.

### 6. Enciende/reinicia el Arduino

El Arduino se conecta automáticamente al hotspot y comienza a enviar telemetría.

### 7. Abre el Dashboard

Usa la dirección que indique Vite.

---

# 14. Cómo comprobar que todo está funcionando

Comprueba la cadena en este orden:

### Servidor

```
http://localhost:8787/health
```

Debe responder.

### Arduino

En el Serial Monitor:

```
115200 baud
```

comprueba que se conectó al Wi-Fi.

### Dashboard

Debe pasar de:

```
ESPERANDO TELEMETRÍA
```

a mostrar el módulo y los datos recibidos.

### Sensores

Mueve el MPU6050 y comprueba que cambien:

- aceleración;
- giroscopio.

El valor del MQ-2 debe cambiar cuando exista una variación en el ambiente.

El buzzer funciona **localmente en el Arduino**, independientemente de la voz del navegador.

---

# 15. Alertas y respuesta de demostración

Las reglas actuales del servidor son experimentales:

- MQ-2 >= 520 → advertencia.
- MQ-2 >= 700 → gas crítico.
- aceleración >= 22 m/s² → impacto.
- giroscopio >= 280 °/s → impacto.
- impacto seguido de baja actividad → posible caída.
- aproximadamente 5 segundos sin telemetría → módulo desconectado.

Una alerta crítica puede producir:

```
sensor
  ↓
Arduino
  ↓
UDP
  ↓
Bun
  ├── reglas de seguridad
  └── dataset
       ↓
    Dashboard
       ├── alerta visual
       ├── alarma sonora del navegador
       ├── voz automática
       └── emergencia simulada
```

La emergencia es **solamente una simulación para la feria**. No se realiza una llamada telefónica real.

---

# 16. Prueba recomendada antes de la feria

### Prueba 1 — servidor

```powershell
bun run server/index.ts
```

Comprueba:

```
http://localhost:8787/health
```

### Prueba 2 — Dashboard

En otra terminal:

```powershell
bun run dev
```

Abre el Dashboard.

### Prueba 3 — Arduino simulado

Carga:

```
arduino_r4_wifi_simulacion.ino
```

Comprueba que el Dashboard reciba telemetría.

### Prueba 4 — sensores reales

Carga:

```
arduino_r4_wifi.ino
```

Comprueba:

- MPU6050;
- MQ-2;
- buzzer;
- Wi-Fi;
- transmisión UDP.

### Prueba 5 — alerta

Prueba primero desde el simulador del Dashboard para comprobar:

- alerta visual;
- alarma;
- voz;
- respuesta de emergencia simulada.

Después prueba el hardware real.

---

# 17. Dataset

Las muestras se guardan localmente en:

```
server/data/helmet_dataset.jsonl
```

Generar datos sintéticos:

```powershell
bun run server/generateSyntheticDataset.ts 10000
```

El dataset local no debe subirse a GitHub si contiene datos generados durante las pruebas.

---

# 18. Problemas frecuentes

### El Arduino se conecta al teléfono, pero el Dashboard no recibe datos

Comprueba:

1. PC y Arduino están en el mismo hotspot.
2. `pcIP` coincide con la IPv4 actual de la PC.
3. UDP 5005 no está bloqueado por Windows Firewall.
4. Bun muestra que escucha en `0.0.0.0:5005`.
5. El Dashboard está abierto desde la misma PC que ejecuta Bun.

### Cambió la IP de la PC

Es normal que un hotspot asigne otra IP.

Haz:

```powershell
ipconfig
```

actualiza `pcIP` en el sketch y vuelve a pulsar **Upload**.

### El Dashboard no conecta

Comprueba primero que Bun esté ejecutándose:

```powershell
bun run server/index.ts
```

Después actualiza el navegador.

### El MPU6050 no responde

Revisa:

- VCC;
- GND;
- SDA;
- SCL;
- librerías instaladas;
- placa seleccionada.

### El buzzer no suena

Comprueba:

- que esté conectado a D8;
- alimentación;
- polaridad;
- que el MQ-2 esté entregando una lectura superior al umbral.

---

## Estado del prototipo

La demostración integra:

- Arduino UNO R4 WiFi;
- MPU6050;
- MQ-2;
- buzzer local;
- comunicación Wi-Fi;
- UDP;
- servidor Bun;
- WebSocket;
- Dashboard React;
- visualización 3D;
- dataset;
- alertas automáticas;
- voz;
- respuesta de emergencia simulada.

Antes de presentar resultados como mediciones científicas definitivas, conviene calibrar el MQ-2, ajustar los umbrales de impacto/caída y probar varias veces el flujo completo en la misma PC y hotspot que se utilizarán durante la feria.
