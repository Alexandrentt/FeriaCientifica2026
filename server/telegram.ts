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

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramAlert(event: SafetyEvent, telemetry: Telemetry) {
  if (!token || !chatId) return;

  const time = new Date(event.timestamp).toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
  });

  const text = [
    "🚨 ALERTA DE SEGURIDAD",
    "",
    `Casco: ${event.helmetId}`,
    `Riesgo: ${event.risk}`,
    `Evento: ${event.type.replaceAll("_", " ")}`,
    "",
    event.message,
    "",
    `Gas MQ-2: ${Math.round(telemetry.gas)}`,
    `Aceleración: ${Math.hypot(telemetry.accel.x, telemetry.accel.y, telemetry.accel.z).toFixed(2)} m/s²`,
    `Giroscopio: ${Math.hypot(telemetry.gyro.x, telemetry.gyro.y, telemetry.gyro.z).toFixed(1)} °/s`,
    `Batería: ${Math.round(telemetry.battery)}%`,
    `Hora: ${time}`,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram HTTP ${response.status}: ${await response.text()}`);
  }
}
