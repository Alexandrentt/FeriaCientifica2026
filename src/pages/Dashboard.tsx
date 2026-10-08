import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Activity, AlertTriangle, Battery, CircleCheck, CircleOff, Gauge, LogOut, RefreshCw, ShieldAlert, Volume2, Wifi, WifiOff, Wind } from "lucide-react";
import { useNavigate } from "react-router";
import { createInitialTelemetry, createSimulatedTelemetry, evaluateTelemetry, type HelmetSnapshot, type HelmetTelemetry, type SafetyEvent, type SafetyEventType } from "@/lib/helmetTelemetry";
import { Helmet3D } from "@/components/Helmet3D";

const statusLabel = { ONLINE: "Normal", WARNING: "Advertencia", CRITICAL: "Crítico", OFFLINE: "Desconectado" };
const statusClasses = { ONLINE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", WARNING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", CRITICAL: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400", OFFLINE: "border-muted bg-muted text-muted-foreground" };

function magnitude(value: { x: number; y: number; z: number }) {
  return Math.sqrt(value.x ** 2 + value.y ** 2 + value.z ** 2);
}

function websocketUrl() {
  const configured = import.meta.env.VITE_TELEMETRY_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:8787/ws`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [telemetry, setTelemetry] = useState<HelmetTelemetry[]>(() => createInitialTelemetry());
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [selectedId, setSelectedId] = useState("CASCO-001");
  const [simulation, setSimulation] = useState<SafetyEventType>("NORMAL");
  const [connected, setConnected] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [ambulanceSimulation, setAmbulanceSimulation] = useState<"IDLE" | "REQUESTED">("IDLE");

  const socketRef = useRef<WebSocket | undefined>(undefined);
  const simulationStepRef = useRef(0);
  const lastSimEventRef = useRef(0);
  const spokenEventRef = useRef<Map<string, number>>(new Map());
  const voiceReadyRef = useRef(false);
  const simulationWindowIdRef = useRef(`DASH-${Date.now()}`);

  const requestAmbulanceSimulation = (helmetId: string) => {
    setAmbulanceSimulation("REQUESTED");
    if ("speechSynthesis" in window && voiceReadyRef.current) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Emergencia detectada. Solicitando una ambulancia para el trabajador del casco ${helmetId}. Esto es una simulación y no realiza una llamada real.`,
      );
      utterance.lang = "es-GT";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const speak = (event: SafetyEvent) => {
      if (!("speechSynthesis" in window) || !voiceReadyRef.current) return;
      const key = event.helmetId + "-" + event.type;
      const now = Date.now();
      const lastSpoken = spokenEventRef.current.get(key) ?? 0;
      if (now - lastSpoken < 5000) return;
      spokenEventRef.current.set(key, now);
      const phrases: Record<string, string> = {
        POSSIBLE_FALL: "Posible caída detectada. Verificar al trabajador y activar el protocolo de emergencia.",
        GAS_DETECTED: event.risk === "HIGH" ? "Concentración crítica de gas detectada" : "Concentración elevada de gas detectada",
        DISCONNECTED: "Casco desconectado",
        NORMAL: "Alerta normalizada",
      };
      const utterance = new SpeechSynthesisUtterance(phrases[event.type] ?? event.message ?? "Alerta de seguridad detectada");
      utterance.lang = "es-GT";
      utterance.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    (window as Window & { __speakHelmetAlert?: (event: SafetyEvent) => void }).__speakHelmetAlert = speak;
    return () => { delete (window as Window & { __speakHelmetAlert?: (event: SafetyEvent) => void }).__speakHelmetAlert; };
  }, []);

  useEffect(() => {
    let socket: WebSocket | undefined;
    try {
      socket = new WebSocket(websocketUrl());
      socketRef.current = socket;
      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        socketRef.current = undefined;
        setConnected(false);
      };
      socket.onerror = () => setConnected(false);
      socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data);
          if (payload.type === "snapshot" && Array.isArray(payload.telemetry) && payload.telemetry.length) {
            setTelemetry(payload.telemetry.map((item: HelmetTelemetry) => ({
              ...item,
              workerName: item.workerName || item.helmetId,
            })));
          }
          if (payload.type === "telemetry") {
            const next = payload.data as HelmetTelemetry;
            setTelemetry((current) => {
              const normalized = { ...next, workerName: next.workerName || next.helmetId };
              return current.some((item) => item.helmetId === normalized.helmetId)
                ? current.map((item) => item.helmetId === normalized.helmetId ? normalized : item)
                : [...current, normalized];
            });
          }
          if (payload.type === "event") {
            const event = payload.data as SafetyEvent;
            setEvents((current) => [{ ...event, id: `${event.helmetId}-${event.timestamp}` }, ...current].slice(0, 8));
            (window as Window & { __speakHelmetAlert?: (event: SafetyEvent) => void }).__speakHelmetAlert?.(event);
            if (event.risk === "HIGH" && (event.type === "POSSIBLE_FALL" || event.type === "GAS_DETECTED")) {
              requestAmbulanceSimulation(event.helmetId);
            }
          }
        } catch {
          // Ignorar mensajes corruptos.
        }
      };
    } catch {
      setConnected(false);
    }

    return () => {
      socketRef.current = undefined;
      socket?.close();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTelemetry((current) => current.map((item) => {
        // Con servidor conectado, la telemetría física recibida por WebSocket es la única fuente de verdad.
        // No debemos sobrescribirla con el simulador local.
        if (connected) return item;

        if (item.helmetId !== selectedId) return item;

        simulationStepRef.current += 1;
        const step = simulationStepRef.current;
        let next: HelmetTelemetry;

        if (simulation === "POSSIBLE_FALL") {
          const impact = step % 12 < 2;
          next = {
            ...item,
            timestamp: Date.now(),
            accel: impact
              ? { x: 18, y: 10, z: 8 }
              : { x: 0.04, y: -0.03, z: 9.81 },
            gyro: impact
              ? { x: 170, y: 180, z: 120 }
              : { x: 1, y: -1, z: 2 },
          };
        } else {
          next = createSimulatedTelemetry(item, simulation === "GAS_DETECTED" ? "GAS_DETECTED" : "NORMAL");
        }

        const result = evaluateTelemetry(next, item);
        if (!connected && simulation !== "NORMAL" && Date.now() - lastSimEventRef.current > 2500) {
          lastSimEventRef.current = Date.now();
          const eventType = simulation === "POSSIBLE_FALL" ? "POSSIBLE_FALL" : result.event;
          if (eventType !== "NORMAL") {
            setEvents((currentEvents) => [{
              id: `${next.helmetId}-sim-${next.timestamp}`,
              helmetId: next.helmetId,
              timestamp: next.timestamp,
              type: eventType,
              risk: "HIGH",
              message: eventType === "GAS_DETECTED"
                ? "Concentración elevada de gas combustible"
                : "Impacto y patrón compatible con una posible caída",
            }, ...currentEvents].slice(0, 8));
            (window as Window & { __speakHelmetAlert?: (event: SafetyEvent) => void }).__speakHelmetAlert?.({
              helmetId: next.helmetId,
              timestamp: next.timestamp,
              type: eventType,
              risk: "HIGH",
              message: eventType === "GAS_DETECTED" ? "Concentración elevada de gas combustible" : "Impacto y patrón compatible con una posible caída",
            });
          }
        }

        // Cuando hay servidor, el simulador entra por el mismo pipeline y se guarda como synthetic.
        if (connected && item.helmetId === selectedId && socketRef.current?.readyState === WebSocket.OPEN) {
          const datasetLabel = simulation === "POSSIBLE_FALL"
            ? (step % 12 < 2 ? "IMPACT" : "POSSIBLE_FALL")
            : simulation === "GAS_DETECTED"
              ? "GAS_CRITICAL"
              : "NORMAL";
          socketRef.current.send(JSON.stringify({
            ...next,
            source: "synthetic",
            windowId: simulationWindowIdRef.current,
            datasetLabel,
          }));
        }

        return next;
      }));
    }, 200);

    return () => window.clearInterval(interval);
  }, [connected, selectedId, simulation]);

  useEffect(() => {
    simulationStepRef.current = 0;
    simulationWindowIdRef.current = `DASH-${Date.now()}`;
  }, [simulation, selectedId]);

  const snapshots = useMemo<HelmetSnapshot[]>(() => telemetry.map((item) => {
    const previous = telemetry.find((candidate) => candidate.helmetId === item.helmetId && candidate.timestamp < item.timestamp);
    return { telemetry: item, ...evaluateTelemetry(item, previous) };
  }), [telemetry]);

  const selected = snapshots.find((item) => item.telemetry.helmetId === selectedId) ?? snapshots[0];
  const counts = {
    online: snapshots.filter((item) => item.status === "ONLINE").length,
    warning: snapshots.filter((item) => item.status === "WARNING").length,
    critical: snapshots.filter((item) => item.status === "CRITICAL").length,
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldAlert className="size-4" /> CENTRO DE SEGURIDAD</div><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Monitoreo de cascos</h1><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">{connected ? <><Wifi className="size-3.5 text-emerald-500" /> Servidor local conectado</> : <><WifiOff className="size-3.5" /> Modo demostración</>} · {user?.name ?? "Operador"}</p></div><div className="flex flex-wrap gap-2 self-start"><Button type="button" variant={voiceReady ? "default" : "outline"} className="gap-2" onClick={() => { if (!("speechSynthesis" in window)) { window.alert("Este navegador no admite voz sintetizada."); return; } const utterance = new SpeechSynthesisUtterance("Voz de alertas activada. Sistema EPI cuatro punto cero."); utterance.lang = "es-GT"; utterance.rate = 0.95; utterance.onend = () => { voiceReadyRef.current = true; setVoiceReady(true); }; utterance.onerror = () => { voiceReadyRef.current = false; setVoiceReady(false); }; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); }}><Volume2 className="size-4" /> {voiceReady ? "Voz activada" : "Activar voz"}</Button><Button type="button" variant="outline" className="gap-2" onClick={handleSignOut}><LogOut className="size-4" /> Cerrar sesión</Button></div></header>
    <section className="grid gap-3 sm:grid-cols-3"><Summary icon={<CircleCheck className="size-5" />} label="Normales" value={counts.online} /><Summary icon={<AlertTriangle className="size-5" />} label="Advertencias" value={counts.warning} /><Summary icon={<ShieldAlert className="size-5" />} label="Críticos" value={counts.critical} /></section>
    <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"><Card className="border-border/70 shadow-none"><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle>Trabajadores conectados</CardTitle><p className="mt-1 text-sm text-muted-foreground">Telemetría recibida de cada casco</p></div><Activity className="size-5 text-primary" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{snapshots.map((item) => { const data = item.telemetry; return <button key={data.helmetId} type="button" onClick={() => setSelectedId(data.helmetId)} className={`rounded-xl border p-4 text-left transition-colors ${data.helmetId === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{data.workerName}</p><p className="text-xs text-muted-foreground">{data.helmetId}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[item.status]}`}>{statusLabel[item.status]}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground"><span>Gas <strong className="text-foreground">{Math.round(data.gas)}</strong></span><span>Batería <strong className="text-foreground">{Math.round(data.battery)}%</strong></span><span>Acel. <strong className="text-foreground">{magnitude(data.accel).toFixed(1)}</strong></span></div></button>; })}</CardContent></Card><Card className="border-border/70 shadow-none"><CardHeader><CardTitle>Alertas recientes</CardTitle><p className="text-sm text-muted-foreground">Eventos detectados por las reglas de seguridad</p></CardHeader><CardContent className="space-y-3">{events.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No se han detectado eventos.</div> : events.slice(0, 5).map((event) => <div key={event.id} className="border-l-2 border-red-500 pl-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{event.helmetId} · {event.type.replaceAll("_", " ")}</p><span className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.message}</p></div>)}</CardContent></Card></section>
    {selected && <section className="grid gap-6"><Card className="border-border/70 shadow-none"><CardHeader><CardTitle>Vista 3D del casco</CardTitle><p className="text-sm text-muted-foreground">Selecciona un módulo para inspeccionar su función y relacionarlo con la telemetría.</p></CardHeader><CardContent><Helmet3D telemetry={selected.telemetry} status={statusLabel[selected.status]} /></CardContent></Card></section>}
    {selected && <section className="grid gap-6 lg:grid-cols-[1fr_280px]"><Card className="border-border/70 shadow-none"><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle>{selected.telemetry.workerName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selected.telemetry.helmetId} · sensores en vivo</p></div><RefreshCw className="size-5 animate-spin text-muted-foreground [animation-duration:3s]" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><SensorValue icon={<Gauge className="size-4" />} label="Aceleración" value={`${magnitude(selected.telemetry.accel).toFixed(2)} m/s²`} /><SensorValue icon={<Activity className="size-4" />} label="Giroscopio" value={`${magnitude(selected.telemetry.gyro).toFixed(1)} °/s`} /><SensorValue icon={<Wind className="size-4" />} label="Gas MQ-2" value={Math.round(selected.telemetry.gas).toString()} /></CardContent></Card><Card className="border-border/70 shadow-none"><CardHeader><CardTitle>Prueba del prototipo</CardTitle><p className="text-xs text-muted-foreground">Las pruebas también alimentan el pipeline cuando el servidor está conectado.</p></CardHeader><CardContent className="space-y-2"><SimulationButton active={simulation === "NORMAL"} onClick={() => setSimulation("NORMAL")}>Normal</SimulationButton><SimulationButton active={simulation === "GAS_DETECTED"} onClick={() => setSimulation("GAS_DETECTED")}>Gas elevado</SimulationButton><SimulationButton active={simulation === "POSSIBLE_FALL"} onClick={() => setSimulation("POSSIBLE_FALL")}>Posible caída</SimulationButton><Button type="button" variant="destructive" className="w-full justify-start" onClick={() => requestAmbulanceSimulation(selected.telemetry.helmetId)}>Simular llamada a ambulancia</Button>{ambulanceSimulation === "REQUESTED" && <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><strong>SIMULACIÓN — NO SE LLAMÓ A EMERGENCIAS</strong><p className="mt-1 text-xs">Solicitud simulada para {selected.telemetry.helmetId}. No se ha contactado ningún servicio externo.</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setAmbulanceSimulation("IDLE")}>Restablecer prueba</Button></div>}<p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"><Battery className="size-3.5" /> Batería {Math.round(selected.telemetry.battery)}%</p></CardContent></Card></section>}
    <footer className="flex items-center gap-2 text-xs text-muted-foreground"><CircleOff className="size-3.5" /> Los umbrales son experimentales y deberán calibrarse con los sensores reales.</footer>
  </div></main>;
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <Card className="border-border/70 shadow-none"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>; }
function SensorValue({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-lg border border-border p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 text-xl font-semibold tabular-nums">{value}</p></div>; }
function SimulationButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <Button type="button" variant={active ? "default" : "outline"} className="w-full justify-start" onClick={onClick}>{children}</Button>; }
