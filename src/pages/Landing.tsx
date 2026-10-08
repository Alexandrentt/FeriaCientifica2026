import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, WifiOff } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="size-8" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            EPI 4.0
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Centro de monitoreo inteligente
          </h1>
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-5">
            <WifiOff className="size-6 text-muted-foreground" />
            <div className="text-left">
              <p className="font-semibold">No hay módulos disponibles</p>
              <p className="mt-1 text-sm text-muted-foreground">
                El sistema está esperando telemetría de un módulo EPI 4.0.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-lg text-sm text-muted-foreground">
            Cuando el módulo se conecte por Wi-Fi, sus sensores aparecerán aquí
            automáticamente junto con el estado, las alertas y la telemetría en tiempo real.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={() => navigate("/dashboard")} className="gap-2">
              <Activity className="size-4" />
              Abrir centro de monitoreo
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
