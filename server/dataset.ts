import { appendFile, mkdir } from "node:fs/promises";

export type DatasetLabel =
  | "NORMAL"
  | "WALKING"
  | "IMPACT"
  | "POSSIBLE_FALL"
  | "GAS_WARNING"
  | "GAS_CRITICAL";

export type DatasetSample = {
  source: "synthetic" | "real";
  label: DatasetLabel;
  helmetId: string;
  timestamp: number;
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  gas: number;
  battery: number;
};

const DATASET_DIR = new URL("./data/", import.meta.url);
const DATASET_FILE = new URL("./data/helmet_dataset.jsonl", import.meta.url);

let ready: Promise<void> | undefined;

async function ensureDataset() {
  if (!ready) {
    ready = mkdir(DATASET_DIR, { recursive: true }).then(() => appendFile(DATASET_FILE, ""));
  }
  await ready;
}

export async function appendDatasetSample(sample: DatasetSample) {
  await ensureDataset();
  await appendFile(DATASET_FILE, JSON.stringify(sample) + "\n");
}

export function datasetPath() {
  return DATASET_FILE.pathname;
}
