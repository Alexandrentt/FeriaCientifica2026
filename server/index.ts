import { appendDatasetSample, type DatasetLabel } from "./dataset";
import { sendTelegramAlert } from "./telegram";

const PORT = Number(process.env.PORT ?? 8787);

type Vector3 = { x: number; y: number; z: number };
type Telemetry = {
  helmetId: string;
  timestamp: number;
  accel: Vector3;
  gyro: Vector3;
  gas: number;
  battery: number;
  source?: "real" | "synthetic";
  windowId?: string;
  datasetLabel?: DatasetLabel;
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
const history = new Map<string, Telemetry[]>();
const lastFallAlert = new Map<string, number>();
const lastGasAlert = new Map<string, number>();
const lastGasWarning = new Map<string, number>();

const THRESHOLDS = {
  gasWarning: 520,
  gasCritical: 700,
  impactAcceleration: 22,
  impactGyroscope: 280,
  lowActivityAccelerationDelta: 0.60,
  lowActivityGyroscope: 35,
  fallConfirmMs: 1200,
  historyMs: 4000,
  disconnectMs: 5000,
  eventCooldownMs: 5000,
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

function addToHistory(data: Telemetry) {
  const list = history.get(data.helmetId) ?? [];
  list.push(data);
  const cutoff = data.timestamp - THRESHOLDS.historyMs;
  history.set(data.helmetId, list.filter((sample) => sample.timestamp >= cutoff).slice(-30));
}

function detectFall(data: Telemetry) {
  const list = history.get(data.helmetId) ?? [];
  const acceleration = magnitude(data.accel);
  const rotation = magnitude(data.gyro);

  if (acceleration >= THRESHOLDS.impactAcceleration || rotation >= THRESHOLDS.impactGyroscope) {
    return false;
  }

  const recentImpact = [...list].reverse().find((sample) => {
    const age = data.timestamp - sample.timestamp;
    return (
      age >= THRESHOLDS.fallConfirmMs &&
      age <= THRESHOLDS.historyMs &&
      (magnitude(sample.accel) >= THRESHOLDS.impactAcceleration ||
        magnitude(sample.gyro) >= THRESHOLDS.impactGyroscope)
    );
  });

  if (!recentImpact) return false;

  const previous = list[list.length - 1];
  const delta = previous
    ? Math.abs(acceleration - magnitude(previous.accel))
    : Math.abs(acceleration - 9.81);

  return (
    Math.abs(acceleration - 9.81) <= THRESHOLDS.lowActivityAccelerationDelta &&
    rotation <= THRESHOLDS.lowActivityGyroscope &&
    delta <= THRESHOLDS.lowActivityAccelerationDelta
  );
}

function evaluate(data: Telemetry): SafetyEvent | null {
  const now = Date.now();

  if (data.gas >= THRESHOLDS.gasCritical) {
    const previous = lastGasAlert.get(data.helmetId) ?? 0;
    if (now - previous >= THRESHOLDS.eventCooldownMs) {
      lastGasAlert.set(data.helmetId, now);
      return {
        helmetId: data.helmetId,
        timestamp: data.timestamp,
        type: "GAS_DETECTED",
        risk: "HIGH",
        message: "Lectura MQ-2 por encima del umbral crítico.",
      };
    }
  }

  if (detectFall(data)) {
    const previous = lastFallAlert.get(data.helmetId) ?? 0;
    if (now - previous >= THRESHOLDS.eventCooldownMs) {
      lastFallAlert.set(data.helmetId, now);
      return {
        helmetId: data.helmetId,
        timestamp: data.timestamp,
        type: "POSSIBLE_FALL",
        risk: "HIGH",
        message: "Impacto seguido de un periodo de baja actividad.",
      };
    }
  }

  if (data.gas >= THRESHOLDS.gasWarning) {
    const previous = lastGasWarning.get(data.helmetId) ?? 0;
    if (now - previous >= THRESHOLDS.eventCooldownMs) {
      lastGasWarning.set(data.helmetId, now);
      return {
        helmetId: data.helmetId,
        timestamp: data.timestamp,
        type: "GAS_DETECTED",
        risk: "MEDIUM",
        message: "Lectura MQ-2 por encima del umbral preventivo.",
      };
    }
  }

  return null;
}

function validateTelemetry(value: unknown): value is Telemetry {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Telemetry>;
  return (
    typeof data.helmetId === "string" &&
    data.helmetId.length > 0 &&
    data.helmetId.length <= 64 &&
    typeof data.timestamp === "number" &&
    Number.isFinite(data.timestamp) &&
    typeof data.gas === "number" &&
    Number.isFinite(data.gas) &&
    typeof data.battery === "number" &&
    Number.isFinite(data.battery) &&
    !!data.accel &&
    typeof data.accel.x === "number" &&
    typeof data.accel.y === "number" &&
    typeof data.accel.z === "number" &&
    !!data.gyro &&
    typeof data.gyro.x === "number" &&
    typeof data.gyro.y === "number" &&
    typeof data.gyro.z === "number" &&
    (data.source === undefined || data.source === "real" || data.source === "synthetic") &&
    (data.datasetLabel === undefined || ["NORMAL", "WALKING", "IMPACT", "POSSIBLE_FALL", "GAS_WARNING", "GAS_CRITICAL"].includes(data.datasetLabel))
  );
}

async function processTelemetry(value: Telemetry) {
  lastTelemetry.set(value.helmetId, value);
  lastSeen.set(value.helmetId, Date.now());
  addToHistory(value);

  broadcast({ type: "telemetry", data: value });

  const event = evaluate(value);

  await appendDatasetSample({
    source: value.source ?? "real",
    label:
      value.source === "synthetic" && value.datasetLabel ? value.datasetLabel :
      event?.type === "POSSIBLE_FALL" ? "POSSIBLE_FALL" :
      event?.type === "GAS_DETECTED" && event.risk === "HIGH" ? "GAS_CRITICAL" :
      event?.type === "GAS_DETECTED" ? "GAS_WARNING" : "NORMAL",
    helmetId: value.helmetId,
    timestamp: value.timestamp,
    accel: value.accel,
    gyro: value.gyro,
    gas: value.gas,
    battery: value.battery,
    windowId: value.windowId,
  });

  if (event) {
    broadcast({ type: "event", data: event });
    void sendTelegramAlert(event, value).catch((error) =>
      console.error("Telegram notification error:", error),
    );
  }

  return event;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const server = Bun.serve({
  port: PORT,
  fetch(request, server) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return Response.json(
        { ok: true, service: "helmet-telemetry", helmets: lastTelemetry.size },
        { headers: corsHeaders() },
      );
    }

    if (url.pathname === "/telemetry" && request.method === "GET") {
      return Response.json([...lastTelemetry.values()], { headers: corsHeaders() });
    }

    if (url.pathname === "/telemetry" && request.method === "POST") {
      return (async () => {
        try {
          const value = await request.json();
          if (!validateTelemetry(value)) {
            return Response.json({ ok: false, error: "Invalid telemetry payload" }, { status: 400, headers: corsHeaders() });
          }
          const event = await processTelemetry(value);
          return Response.json({ ok: true, event }, { headers: corsHeaders() });
        } catch (error) {
          console.error("HTTP telemetry error:", error);
          return Response.json({ ok: false, error: "Unable to process telemetry" }, { status: 500, headers: corsHeaders() });
        }
      })();
    }

    if (url.pathname === "/ws") {
      if (server.upgrade(request)) return;
      return new Response("WebSocket upgrade required", { status: 426 });
    }

    return new Response("Helmet telemetry server", { status: 200, headers: corsHeaders() });
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

        void processTelemetry(value).catch((error) =>
          console.error("WebSocket telemetry error:", error),
        );
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
      const event = {
        helmetId,
        timestamp: now,
        type: "DISCONNECTED",
        risk: "HIGH",
        message: "No se recibió telemetría dentro del intervalo esperado.",
      } satisfies SafetyEvent;

      broadcast({ type: "event", data: event });

      const telemetry = lastTelemetry.get(helmetId);
      if (telemetry) {
        void sendTelegramAlert(event, telemetry).catch((error) =>
          console.error("Telegram disconnect notification error:", error),
        );
      }

      lastSeen.delete(helmetId);
    }
  }
}, 1000);

console.log(`Helmet telemetry server running at http://localhost:${server.port}`);
console.log(`WebSocket endpoint: ws://localhost:${server.port}/ws`);
