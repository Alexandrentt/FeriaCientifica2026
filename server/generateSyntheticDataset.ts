import { appendDatasetSample } from "./dataset";

const samplesPerWindow = 50; // 10 s a 5 Hz.
const requestedSamples = Number(process.argv[2] ?? 5000);
const helmetId = process.argv[3] ?? "SIM-001";

function noise(amount: number) {
  return (Math.random() - 0.5) * amount;
}

function sample(
  windowId: string,
  label: "NORMAL" | "WALKING" | "IMPACT" | "POSSIBLE_FALL" | "GAS_WARNING" | "GAS_CRITICAL",
  i: number,
  total: number,
) {
  const progress = i / Math.max(1, total - 1);

  if (label === "WALKING") {
    const step = Math.sin(progress * Math.PI * 8);
    return {
      source: "synthetic" as const,
      label,
      helmetId,
      timestamp: Date.now() + i * 200,
      windowId,
      accel: { x: noise(2.5) + step * 1.5, y: noise(2.5), z: 9.81 + noise(3) + Math.abs(step) * 2 },
      gyro: { x: noise(45), y: noise(45), z: noise(45) },
      gas: 320 + noise(35),
      battery: 100 - progress * 5,
    };
  }

  if (label === "IMPACT") {
    const impactIndex = Math.floor(total * 0.55);
    const isImpact = i >= impactIndex && i < impactIndex + 2;
    return {
      source: "synthetic" as const,
      label: isImpact ? "IMPACT" as const : "NORMAL" as const,
      helmetId,
      timestamp: Date.now() + i * 200,
      windowId,
      accel: isImpact
        ? { x: 15 + noise(5), y: 8 + noise(4), z: 16 + noise(5) }
        : { x: noise(0.35), y: noise(0.35), z: 9.81 + noise(0.4) },
      gyro: isImpact
        ? { x: 170 + noise(60), y: 150 + noise(60), z: 100 + noise(50) }
        : { x: noise(8), y: noise(8), z: noise(8) },
      gas: 330 + noise(30),
      battery: 95,
    };
  }

  if (label === "POSSIBLE_FALL") {
    const impactIndex = Math.floor(total * 0.45);
    const isImpact = i >= impactIndex && i < impactIndex + 2;
    const isInert = i >= impactIndex + 6;
    return {
      source: "synthetic" as const,
      label,
      helmetId,
      timestamp: Date.now() + i * 200,
      windowId,
      accel: isImpact
        ? { x: 18 + noise(4), y: 10 + noise(3), z: 8 + noise(4) }
        : { x: noise(isInert ? 0.15 : 0.5), y: noise(isInert ? 0.15 : 0.5), z: 9.81 + noise(isInert ? 0.15 : 0.5) },
      gyro: isImpact
        ? { x: 170 + noise(60), y: 180 + noise(60), z: 120 + noise(50) }
        : { x: noise(isInert ? 3 : 12), y: noise(isInert ? 3 : 12), z: noise(isInert ? 3 : 12) },
      gas: 330 + noise(25),
      battery: 95,
    };
  }

  if (label === "GAS_WARNING" || label === "GAS_CRITICAL") {
    return {
      source: "synthetic" as const,
      label,
      helmetId,
      timestamp: Date.now() + i * 200,
      windowId,
      accel: { x: noise(0.5), y: noise(0.5), z: 9.81 + noise(0.5) },
      gyro: { x: noise(10), y: noise(10), z: noise(10) },
      gas: label === "GAS_CRITICAL" ? 760 + noise(60) : 580 + noise(35),
      battery: 92,
    };
  }

  return {
    source: "synthetic" as const,
    label: "NORMAL" as const,
    helmetId,
    timestamp: Date.now() + i * 200,
    windowId,
    accel: { x: noise(0.35), y: noise(0.35), z: 9.81 + noise(0.4) },
    gyro: { x: noise(8), y: noise(8), z: noise(8) },
    gas: 320 + noise(30),
    battery: 100 - progress * 5,
  };
}

const sequenceTypes = ["NORMAL", "WALKING", "IMPACT", "POSSIBLE_FALL", "GAS_WARNING", "GAS_CRITICAL"] as const;

let generated = 0;
let windowNumber = 0;

while (generated < requestedSamples) {
  const windowId = `SYN-${Date.now()}-${windowNumber}`;
  const label = sequenceTypes[windowNumber % sequenceTypes.length];

  for (let i = 0; i < samplesPerWindow && generated < requestedSamples; i++) {
    await appendDatasetSample(sample(windowId, label, i, samplesPerWindow));
    generated++;
  }

  windowNumber++;
}

console.log(`Generated ${generated} synthetic samples in server/data/helmet_dataset.jsonl`);
