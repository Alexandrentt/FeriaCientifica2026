import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  AlertTriangle,
  Battery,
  CircleCheck,
  CircleOff,
  Gauge,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  createInitialTelemetry,
  createSimulatedTelemetry,
  evaluateTelemetry,
  type HelmetSnapshot,
  type HelmetTelemetry,
  type SafetyEvent,
  type SafetyEventType,
} from "@/lib/helmetTelemetry";

const statusLabel = {
  ONLINE: "Normal",
  WARNING: "Advertencia",
  CRITICAL: "Crítico",
  OFFLINE: "Desconectado",
};

const statusClasses = {
  ONLINE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  WARNING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CRITICAL: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  OFFLINE: "border-muted bg-muted text-muted-foreground",
};

function magnitude(value: { x: number; y: number; z: number }) {
  return Math.sqrt(value.x ** 2 + value.y ** 2 + value.z ** 2);
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [telemetry, setTelemetry] = useState<HelmetTelemetry[]>(() => createInitialTelemetry());
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [selectedId, setSelectedId] = useState("CASCO-001");
  const [simulation, setSimulation] = useState<SafetyEventType>("NORMAL");

  const snapshots = useMemo<HelmetSnapshot[]>(() => telemetry.map((item) => ({
    telemetry: item,
    ...evaluateTelemetry(item),
  })), [telemetry]);

  const selected = snapshots.find((item) => item.telemetry.helmetId === selectedId) ?? snapshots[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTelemetry((current) => current.map((item) => {
        const next = createSimulatedTelemetry(item, item.helmetId === selectedId ? simulation : undefined);
        const result = evaluateTelemetry(next, item);

        if (result.event !== "NORMAL") {
          const event: SafetyEvent = {
            id: `${next.helmetId}-${next.timestamp}`,
            helmetId: next.helmetId,
            timestamp: next.timestamp,
            type: result.event,
            risk: result.risk,
            message: result.event === "GAS_DETECTED"
              ? "Concentración elevada de gas combustible"
              : "Impacto y patrón compatible con una posible caída",
          };
          setEvents((currentEvents) => [event, ...currentEvents].slice(0, 8));
        }

        return next;
      }));
    }, 1200);

    return () => window.clearInterval(interval);
  }, [selectedId, simulation]);

  const counts = {
    online: snapshots.filter((item) => item.status === "ONLINE").length,
    warning: snapshots.filter((item) => item.status === "WARNING").length,
    critical: snapshots.filter((item) => item.status === "CRITICAL").length,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldAlert className="size-4" />
              CENTRO DE SEGURIDAD
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Monitoreo de cascos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Telemetría local de trabajadores en tiempo real · {user?.name ?? "Operador"}
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2 self-start" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <Summary icon={<CircleCheck className="size-5" />} label="Normales" value={counts.online} />
          <Summary icon={<AlertTriangle className="size-5" />} label="Advertencias" value={counts.warning} />
          <Summary icon={<ShieldAlert className="size-5" />} label="Críticos" value={counts.critical} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Trabajadores conectados</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Estado recibido de cada casco</p>
              </div>
              <Activity className="size-5 text-primary" />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {snapshots.map((item) => {
                const { telemetry: data } = item;
                const active = data.helmetId === selectedId;
                return (
                  <button
                    key={data.helmetId}
                    type="button"
                    onClick={() => setSelectedId(data.helmetId)}
                    className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{data.workerName}</p>
                        <p className="text-xs text-muted-foreground">{data.helmetId}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Gas <strong className="text-foreground">{Math.round(data.gas)}</strong></span>
                      <span>Batería <strong className="text-foreground">{Math.round(data.battery)}%</strong></span>
                      <span>Acel. <strong className="text-foreground">{magnitude(data.accel).toFixed(1)}</strong></span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardHeader>
              <CardTitle>Alertas recientes</CardTitle>
              <p className="text-sm text-muted-foreground">Eventos detectados por las reglas de seguridad</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No se han detectado eventos. El sistema está monitoreando.
                </div>
              ) : events.slice(0, 5).map((event) => (
                <div key={event.id} className="border-l-2 border-red-500 pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{event.helmetId} · {event.type.replaceAll("_", " ")}</p>
                    <span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{event.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {selected && (
          <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <Card className="border-border/70 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{selected.telemetry.workerName}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.telemetry.helmetId} · sensores en vivo</p>
                </div>
                <RefreshCw className="size-5 animate-spin text-muted-foreground [animation-duration:3s]" />
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <SensorValue icon={<Gauge className="size-4" />} label="Aceleración" value={`${magnitude(selected.telemetry.accel).toFixed(2)} m/s²`} />
                <SensorValue icon={<Activity className="size-4" />} label="Giroscopio" value={`${magnitude(selected.telemetry.gyro).toFixed(1)} °/s`} />
                <SensorValue icon={<Wind className="size-4" />} label="Gas MQ-2" value={Math.round(selected.telemetry.gas).toString()} />
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-none">
              <CardHeader>
                <CardTitle>Prueba del prototipo</CardTitle>
                <p className="text-xs text-muted-foreground">Simula eventos mientras el ESP32 aún no está conectado.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <SimulationButton active={simulation === "NORMAL"} onClick={() => setSimulation("NORMAL")}>Normal</SimulationButton>
                <SimulationButton active={simulation === "GAS_DETECTED"} onClick={() => setSimulation("GAS_DETECTED")}>Gas elevado</SimulationButton>
                <SimulationButton active={simulation === "POSSIBLE_FALL"} onClick={() => setSimulation("POSSIBLE_FALL")}>Posible caída</SimulationButton>
                <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <Battery className="size-3.5" /> Batería {Math.round(selected.telemetry.battery)}%
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        <footer className="flex items-center gap-2 text-xs text-muted-foreground">
          <CircleOff className="size-3.5" />
          Modo demostración: los umbrales son experimentales y deberán calibrarse con los sensores reales.
        </footer>
      </div>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SensorValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SimulationButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={active ? "default" : "outline"} className="w-full justify-start" onClick={onClick}>
      {children}
    </Button>
  );
}
