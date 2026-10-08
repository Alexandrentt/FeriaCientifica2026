export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type HelmetStatus = "ONLINE" | "WARNING" | "CRITICAL" | "OFFLINE";
export type SafetyEventType = "NORMAL" | "POSSIBLE_FALL" | "GAS_DETECTED" | "INACTIVITY" | "DISCONNECTED";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HelmetTelemetry {
  helmetId: string;
  workerName: string;
  timestamp: number;
  accel: Vector3;
  gyro: Vector3;
  gas: number;
  battery: number;
}

export interface SafetyEvent {
  id: string;
  helmetId: string;
  timestamp: number;
  type: SafetyEventType;
  risk: RiskLevel;
  message: string;
}

export interface HelmetSnapshot {
  telemetry: HelmetTelemetry;
  status: HelmetStatus;
  risk: RiskLevel;
  event: SafetyEventType;
}

// Initial experimental thresholds. These are deliberately centralized so they
// can be replaced after calibration with the real MPU6050/MQ-2 measurements.
export const SAFETY_THRESHOLDS = {
  gasWarning: 520,
  gasCritical: 700,
  impactAcceleration: 22,
  impactGyroscope: 280,
  inactivityAccelerationDelta: 0.45,
  offlineAfterMs: 5000,
};

const magnitude = (v: Vector3) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);

export function evaluateTelemetry(
  current: HelmetTelemetry,
  previous?: HelmetTelemetry,
): Pick<HelmetSnapshot, "status" | "risk" | "event"> {
  if (Date.now() - current.timestamp > SAFETY_THRESHOLDS.offlineAfterMs) {
    return { status: "OFFLINE", risk: "HIGH", event: "DISCONNECTED" };
  }

  if (current.gas >= SAFETY_THRESHOLDS.gasCritical) {
    return { status: "CRITICAL", risk: "HIGH", event: "GAS_DETECTED" };
  }

  const acceleration = magnitude(current.accel);
  const rotation = magnitude(current.gyro);
  const previousAcceleration = previous ? magnitude(previous.accel) : acceleration;
  const accelerationDelta = Math.abs(acceleration - previousAcceleration);
  const possibleImpact =
    acceleration >= SAFETY_THRESHOLDS.impactAcceleration ||
    rotation >= SAFETY_THRESHOLDS.impactGyroscope;
  const lowMovement = accelerationDelta <= SAFETY_THRESHOLDS.inactivityAccelerationDelta;

  if (possibleImpact && lowMovement) {
    return { status: "CRITICAL", risk: "HIGH", event: "POSSIBLE_FALL" };
  }

  if (current.gas >= SAFETY_THRESHOLDS.gasWarning) {
    return { status: "WARNING", risk: "MEDIUM", event: "GAS_DETECTED" };
  }

  return { status: "ONLINE", risk: "LOW", event: "NORMAL" };
}

const workers = [
  ["CASCO-001", "Ana López"],
  ["CASCO-002", "Carlos Pérez"],
  ["CASCO-003", "María Gómez"],
  ["CASCO-004", "Luis Hernández"],
  ["CASCO-005", "Diego Morales"],
  ["CASCO-006", "Sofía Ramírez"],
] as const;

export function createSimulatedTelemetry(previous: HelmetTelemetry, forcedEvent?: SafetyEventType): HelmetTelemetry {
  const now = Date.now();
  const event = forcedEvent ?? "NORMAL";
  const base = 9.81;

  if (event === "GAS_DETECTED") {
    return { ...previous, timestamp: now, gas: 760 + Math.random() * 60 };
  }

  if (event === "POSSIBLE_FALL") {
    return {
      ...previous,
      timestamp: now,
      accel: { x: 18, y: 10, z: 8 },
      gyro: { x: 170, y: 180, z: 120 },
    };
  }

  return {
    ...previous,
    timestamp: now,
    accel: {
      x: (Math.random() - 0.5) * 0.35,
      y: (Math.random() - 0.5) * 0.35,
      z: base + (Math.random() - 0.5) * 0.4,
    },
    gyro: {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
    },
    gas: Math.max(320, previous.gas + (Math.random() - 0.5) * 18),
    battery: Math.max(15, previous.battery - 0.001),
  };
}

export function createInitialTelemetry(): HelmetTelemetry[] {
  return [];
  
  /* return workers.map(([helmetId, workerName], index) => ({
    helmetId,
    workerName,
    timestamp: Date.now(),
    accel: { x: 0, y: 0, z: 9.81 },
    gyro: { x: 0, y: 0, z: 0 },
    gas: 330 + index * 24,
    battery: 76 + index * 3,
  })); */
}
