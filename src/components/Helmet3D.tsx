import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { HelmetTelemetry } from "@/lib/helmetTelemetry";

type ModuleId = "MCU_WIFI" | "MPU6050" | "MQ-2" | "BUZZER" | "BATTERY";

const moduleInfo: Record<ModuleId, { label: string; description: string }> = {
  MCU_WIFI: { label: "Control + Wi-Fi", description: "Controlador del módulo, enlace inalámbrico y envío de telemetría al servidor local." },
  MPU6050: { label: "MPU6050", description: "Acelerómetro y giroscopio para movimiento e impactos." },
  "MQ-2": { label: "MQ-2", description: "Sensor experimental de presencia de gas combustible." },
  BUZZER: { label: "Buzzer", description: "Alerta sonora local controlada por el Arduino UNO R4 WiFi." },
  BATTERY: { label: "Alimentación", description: "Fuente de energía del módulo; el porcentaje mostrado es actualmente un dato de prueba." },
};

const modulePositions: Record<ModuleId, [number, number, number]> = {
  MCU_WIFI: [0.0, 0.05, -0.52],
  MPU6050: [-0.38, 0.16, -0.02],
  "MQ-2": [0.40, 0.08, 0.10],
  BUZZER: [0.12, -0.10, 0.52],
  BATTERY: [-0.15, -0.12, -0.42],
};

export function Helmet3D({ telemetry, status }: { telemetry: HelmetTelemetry; status: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef(telemetry);
  const selectedModuleRef = useRef<ModuleId>("MCU_WIFI");
  const [selectedModule, setSelectedModule] = useState<ModuleId>("MCU_WIFI");

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

    const device = new THREE.Group();
    scene.add(device);

    const enclosure = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.78, 0.92),
      new THREE.MeshStandardMaterial({ color: 0x252c33, metalness: 0.35, roughness: 0.5 }),
    );
    enclosure.position.y = 0.02;
    enclosure.rotation.y = -0.08;
    device.add(enclosure);

    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.055, 0.70),
      new THREE.MeshStandardMaterial({ color: 0x4b5661, metalness: 0.5, roughness: 0.38 }),
    );
    topPlate.position.set(0, 0.42, 0);
    topPlate.rotation.y = -0.08;
    device.add(topPlate);

    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.34, 0.045),
      new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.65, roughness: 0.25 }),
    );
    frontPanel.position.set(0, -0.03, 0.49);
    device.add(frontPanel);

    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x8a949e, emissive: 0x203040, emissiveIntensity: 1.5 }),
    );
    led.position.set(0.44, 0.10, 0.53);
    device.add(led);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0x8a949e, metalness: 0.7, roughness: 0.3 }),
    );
    antenna.position.set(-0.48, 0.56, -0.18);
    antenna.rotation.z = -0.25;
    device.add(antenna);

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
      device.add(mesh);
      moduleMeshes.set(id, mesh);
    });

    const wires = new THREE.Group();
    const wireMaterial = new THREE.LineBasicMaterial({ color: 0x66717c, transparent: true, opacity: 0.7 });
    const center = new THREE.Vector3(...modulePositions.MCU_WIFI);

    (Object.keys(modulePositions) as ModuleId[])
      .filter((id) => id !== "MCU_WIFI")
      .forEach((id) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          center,
          new THREE.Vector3(...modulePositions[id]),
        ]);
        wires.add(new THREE.Line(geometry, wireMaterial));
      });
    device.add(wires);

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

      device.rotation.y += 0.0025;
      device.rotation.x = THREE.MathUtils.lerp(
        device.rotation.x,
        Math.max(-0.28, Math.min(0.28, current.gyro.y / 700)),
        0.05,
      );
      device.rotation.z = THREE.MathUtils.lerp(
        device.rotation.z,
        Math.max(-0.28, Math.min(0.28, current.gyro.x / 700)),
        0.05,
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
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Módulo seleccionado</p>
          <p className="font-semibold">Módulo Wi-Fi · {telemetry.helmetId}</p>
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
