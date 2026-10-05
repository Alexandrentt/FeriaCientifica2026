import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { HelmetTelemetry } from "@/lib/helmetTelemetry";

type ModuleId = "MPU6050" | "MQ-2" | "BUZZER" | "ESP32" | "BATTERY";

const moduleInfo: Record<ModuleId, { label: string; description: string }> = {
  ESP32: { label: "ESP32", description: "Controlador, Wi-Fi y enlace con el servidor local." },
  MPU6050: { label: "MPU6050", description: "Acelerómetro y giroscopio para movimiento e impactos." },
  "MQ-2": { label: "MQ-2", description: "Sensor experimental de presencia de gas combustible." },
  BUZZER: { label: "Buzzer", description: "Alerta sonora local controlada por el ESP32." },
  BATTERY: { label: "Batería", description: "Alimentación del casco; porcentaje mostrado actualmente como dato de prueba." },
};

const modulePositions: Record<ModuleId, [number, number, number]> = {
  ESP32: [0.0, 0.05, -0.52],
  MPU6050: [-0.38, 0.16, -0.02],
  "MQ-2": [0.40, 0.08, 0.10],
  BUZZER: [0.12, -0.10, 0.52],
  BATTERY: [-0.15, -0.12, -0.42],
};

export function Helmet3D({ telemetry, status }: { telemetry: HelmetTelemetry; status: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef(telemetry);
  const selectedModuleRef = useRef<ModuleId>("ESP32");
  const [selectedModule, setSelectedModule] = useState<ModuleId>("ESP32");

  telemetryRef.current = telemetry;
  selectedModuleRef.current = selectedModule;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d10);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(1.9, 1.25, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x18202a, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(2, 3, 3);
    scene.add(key);

    const helmet = new THREE.Group();
    scene.add(helmet);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshStandardMaterial({ color: 0x28313b, metalness: 0.15, roughness: 0.68 }),
    );
    shell.scale.set(1.05, 0.78, 0.98);
    shell.position.y = 0.02;
    helmet.add(shell);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.045, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x65717d, metalness: 0.25, roughness: 0.55 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.08, 0.95, 1);
    rim.position.y = -0.38;
    helmet.add(rim);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.30, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x111820, transparent: true, opacity: 0.82, metalness: 0.55, roughness: 0.22 }),
    );
    visor.position.set(0, 0.0, 0.77);
    visor.rotation.x = -0.08;
    visor.scale.set(1.0, 0.72, 1);
    helmet.add(visor);

    const moduleMeshes = new Map<ModuleId, THREE.Mesh>();

    (Object.keys(modulePositions) as ModuleId[]).forEach((id) => {
      const geometry = id === "BUZZER"
        ? new THREE.CylinderGeometry(0.10, 0.10, 0.08, 20)
        : new THREE.BoxGeometry(0.20, 0.11, 0.14);

      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0x8a949e, emissive: 0x000000, roughness: 0.55 }),
      );
      mesh.position.set(...modulePositions[id]);
      if (id === "BUZZER") mesh.rotation.x = Math.PI / 2;
      mesh.userData.moduleId = id;
      helmet.add(mesh);
      moduleMeshes.set(id, mesh);
    });

    const wires = new THREE.Group();
    const wireMaterial = new THREE.LineBasicMaterial({ color: 0x66717c, transparent: true, opacity: 0.7 });
    const center = new THREE.Vector3(...modulePositions.ESP32);

    (Object.keys(modulePositions) as ModuleId[])
      .filter((id) => id !== "ESP32")
      .forEach((id) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          center,
          new THREE.Vector3(...modulePositions[id]),
        ]);
        wires.add(new THREE.Line(geometry, wireMaterial));
      });
    helmet.add(wires);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x11151a, transparent: true, opacity: 0.65 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.53;
    scene.add(floor);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const resize = () => {
      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...moduleMeshes.values()])[0];
      if (hit?.object.userData.moduleId) {
        setSelectedModule(hit.object.userData.moduleId as ModuleId);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", resize);
    resize();

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const current = telemetryRef.current;

      helmet.rotation.y += 0.0025;
      helmet.rotation.x = THREE.MathUtils.lerp(
        helmet.rotation.x,
        Math.max(-0.18, Math.min(0.18, current.gyro.y / 900)),
        0.04,
      );

      moduleMeshes.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const active = id === selectedModuleRef.current;
        material.emissive.setHex(active ? 0x4f5963 : 0x000000);
        material.emissiveIntensity = active ? 1.2 : 0;
        mesh.scale.setScalar(active ? 1.22 : 1);
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const selectedInfo = moduleInfo[selectedModule];
  const acceleration = Math.hypot(telemetry.accel.x, telemetry.accel.y, telemetry.accel.z);
  const rotation = Math.hypot(telemetry.gyro.x, telemetry.gyro.y, telemetry.gyro.z);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_230px]">
      <div ref={mountRef} className="min-h-[360px] overflow-hidden rounded-xl border border-border bg-black" />
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Casco seleccionado</p>
          <p className="font-semibold">{telemetry.helmetId}</p>
          <p className="text-xs text-muted-foreground">{telemetry.workerName || "Trabajador no asignado"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(moduleInfo) as ModuleId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedModule(id)}
              className={`rounded-lg border px-2 py-2 text-left text-xs transition-colors ${selectedModule === id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            >
              {moduleInfo[id].label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="font-medium text-sm">{selectedInfo.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{selectedInfo.description}</p>
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
          <div className="flex justify-between"><span>Estado</span><strong>{status}</strong></div>
          <div className="flex justify-between"><span>Gas MQ-2</span><strong>{Math.round(telemetry.gas)}</strong></div>
          <div className="flex justify-between"><span>Aceleración</span><strong>{acceleration.toFixed(2)} m/s²</strong></div>
          <div className="flex justify-between"><span>Giroscopio</span><strong>{rotation.toFixed(1)} °/s</strong></div>
          <div className="flex justify-between"><span>Batería</span><strong>{Math.round(telemetry.battery)}%</strong></div>
        </div>
      </div>
    </div>
  );
}
