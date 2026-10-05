const PORT = Number(process.env.PORT ?? 8787);

type Vector3 = { x: number; y: number; z: number };
type Telemetry = {
  helmetId: string;
  timestamp: number;
  accel: Vector3;
  gyro: Vector3;
  gas: number;
  battery: number;
};

type SafetyEvent = {
  helmetId: string;
  timestamp: number;
  type: "POSSIBLE_FALL" | "GAS_DETECTED" | "DISCONNECTED";
  risk: "MEDIUM" | "HIGH";
  message: string;
};

const clients = new Set<WebSocket>();
const lastTelemetry = new Map<string, Telemetry>();
const lastSeen = new Map<string, number>();

const THRESHOLDS = {
  gasWarning: 520,
  gasCritical: 700,
  impactAcceleration: 22,
  impactGyroscope: 280,
  inactivityDelta: 0.45,
  disconnectMs: 5000,
};

function magnitude(v: Vector3) {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}

function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
}

function evaluate(data: Telemetry, previous?: Telemetry): SafetyEvent | null {
  if (data.gas >= THRESHOLDS.gasCritical) {
    return {
      helmetId: data.helmetId,
      timestamp: data.timestamp,
      type: "GAS_DETECTED",
      risk: "HIGH",
      message: "Concentración elevada de gas combustible detectada.",
    };
  }

  const acceleration = magnitude(data.accel);
  const rotation = magnitude(data.gyro);
  const previousAcceleration = previous ? magnitude(previous.accel) : acceleration;
  const delta = Math.abs(acceleration - previousAcceleration);
  const impact = acceleration >= THRESHOLDS.impactAcceleration || rotation >= THRESHOLDS.impactGyroscope;

  if (impact && delta <= THRESHOLDS.inactivityDelta) {
    return {
      helmetId: data.helmetId,
      timestamp: data.timestamp,
      type: "POSSIBLE_FALL",
      risk: "HIGH",
      message: "Impacto seguido de un patrón compatible con inmovilidad.",
    };
  }

  if (data.gas >= THRESHOLDS.gasWarning) {
    return {
      helmetId: data.helmetId,
      timestamp: data.timestamp,
      type: "GAS_DETECTED",
      risk: "MEDIUM",
      message: "Nivel de gas superior al umbral preventivo.",
    };
  }

  return null;
}

function validateTelemetry(value: unknown): value is Telemetry {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Telemetry>;
  return (
    typeof data.helmetId === "string" &&
    typeof data.timestamp === "number" &&
    typeof data.gas === "number" &&
    typeof data.battery === "number" &&
    !!data.accel && typeof data.accel.x === "number" && typeof data.accel.y === "number" && typeof data.accel.z === "number" &&
    !!data.gyro && typeof data.gyro.x === "number" && typeof data.gyro.y === "number" && typeof data.gyro.z === "number"
  );
}

const server = Bun.serve({
  port: PORT,
  fetch(request, server) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "helmet-telemetry", helmets: lastTelemetry.size });
    }

    if (url.pathname === "/telemetry" && request.method === "GET") {
      return Response.json([...lastTelemetry.values()]);
    }

    if (url.pathname === "/ws") {
      if (server.upgrade(request)) return;
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    return new Response("Helmet telemetry server", { status: 200 });
  },
  websocket: {
    open(socket) {
      clients.add(socket);
      socket.send(JSON.stringify({ type: "snapshot", telemetry: [...lastTelemetry.values()] }));
    },
    message(socket, message) {
      try {
        const value = JSON.parse(String(message));
        if (!validateTelemetry(value)) {
          socket.send(JSON.stringify({ type: "error", message: "Invalid telemetry payload" }));
          return;
        }

        const previous = lastTelemetry.get(value.helmetId);
        lastTelemetry.set(value.helmetId, value);
        lastSeen.set(value.helmetId, Date.now());

        broadcast({ type: "telemetry", data: value });

        const event = evaluate(value, previous);
        if (event) broadcast({ type: "event", data: event });
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    },
    close(socket) {
      clients.delete(socket);
    },
  },
});

setInterval(() => {
  const now = Date.now();
  for (const [helmetId, seen] of lastSeen) {
    if (now - seen > THRESHOLDS.disconnectMs) {
      broadcast({
        type: "event",
        data: {
          helmetId,
          timestamp: now,
          type: "DISCONNECTED",
          risk: "HIGH",
          message: "No se recibió telemetría dentro del intervalo esperado.",
        } satisfies SafetyEvent,
      });
      lastSeen.delete(helmetId);
    }
  }
}, 1000);

console.log(`Helmet telemetry server running at http://localhost:${server.port}`);
console.log(`WebSocket endpoint: ws://localhost:${server.port}/ws`);
