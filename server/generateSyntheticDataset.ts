import { appendDatasetSample } from "./dataset";

const samples = Number(process.argv[2] ?? 5000);
const helmetId = process.argv[3] ?? "SIM-001";

function noise(amount: number) {
  return (Math.random() - 0.5) * amount;
}

function normalSample(i: number) {
  return {
    source: "synthetic" as const,
    label: "NORMAL" as const,
    helmetId,
    timestamp: Date.now() + i,
    accel: { x: noise(0.35), y: noise(0.35), z: 9.81 + noise(0.4) },
    gyro: { x: noise(8), y: noise(8), z: noise(8) },
    gas: 320 + noise(30),
    battery: 100 - i / samples * 5,
  };
}

function walkingSample(i: number) {
  return {
    source: "synthetic" as const,
    label: "WALKING" as const,
    helmetId,
    timestamp: Date.now() + i,
    accel: { x: noise(2.5), y: noise(2.5), z: 9.81 + noise(3.0) },
    gyro: { x: noise(45), y: noise(45), z: noise(45) },
    gas: 320 + noise(35),
    battery: 100 - i / samples * 5,
  };
}

function impactSample(i: number) {
  return {
    source: "synthetic" as const,
    label: "IMPACT" as const,
    helmetId,
    timestamp: Date.now() + i,
    accel: { x: 15 + noise(5), y: 8 + noise(4), z: 16 + noise(5) },
    gyro: { x: 170 + noise(60), y: 150 + noise(60), z: 100 + noise(50) },
    gas: 330 + noise(30),
    battery: 95,
  };
}

function fallSample(i: number) {
  return {
    source: "synthetic" as const,
    label: "POSSIBLE_FALL" as const,
    helmetId,
    timestamp: Date.now() + i,
    accel: { x: noise(0.2), y: noise(0.2), z: 9.81 + noise(0.2) },
    gyro: { x: noise(3), y: noise(3), z: noise(3) },
    gas: 330 + noise(25),
    battery: 95,
  };
}

function gasSample(i: number, critical: boolean) {
  return {
    source: "synthetic" as const,
    label: (critical ? "GAS_CRITICAL" : "GAS_WARNING") as "GAS_CRITICAL" | "GAS_WARNING",
    helmetId,
    timestamp: Date.now() + i,
    accel: { x: noise(0.5), y: noise(0.5), z: 9.81 + noise(0.5) },
    gyro: { x: noise(10), y: noise(10), z: noise(10) },
    gas: critical ? 760 + noise(80) : 580 + noise(45),
    battery: 92,
  };
}

const generators = [
  normalSample,
  normalSample,
  normalSample,
  walkingSample,
  walkingSample,
  impactSample,
  fallSample,
  gasSample,
  (i: number) => gasSample(i, true),
];

for (let i = 0; i < samples; i++) {
  const generator = generators[i % generators.length];
  await appendDatasetSample(generator(i));
}

console.log(`Generated ${samples} synthetic samples in server/data/helmet_dataset.jsonl`);
