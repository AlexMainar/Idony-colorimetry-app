"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  averageRgb,
  classifyCategoryFromSkinRGB,
  paletteForSeason,
  refinarCategoria,
} from "@/lib/color";
import { useAppStore } from "@/lib/store";
import { loadFaceLandmarker, getSkinPoints } from "@/lib/cv/face";
import KlaviyoForm from '@/components/KlaviyoForm';

declare global {
  interface Window {
    localStream?: MediaStream;
  }
}


export default function AnalyzePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const router = useRouter();
  const setPalette = useAppStore((s) => s.setPalette);

  const [ojos, setOjos] = useState<
    "azules" | "grises" | "verdes" | "avellana" | "marrones" | "negros"
  >("marrones");

  const [cabello, setCabello] = useState<
    "rubio" | "rubio-ceniza" | "castaño" | "negro" | "rojo" | "dorado"
  >("rubio-ceniza");

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
  // Allow ?forceLead=1 to always show the form
  if (typeof window !== 'undefined') {
    const u = new URL(window.location.href);
    if (u.searchParams.get('forceLead') === '1') {
      localStorage.removeItem('idony_email');
      setShowForm(true);
    }
  }
}, []);
  // called when the user clicks “Iniciar colorimetría”
  const handleStart = () => {
    const saved = localStorage.getItem('idony_email');
    if (!saved) setShowForm(true);
    else startCamera(); // your existing camera start logic
  };

  const handleFormSuccess = (email: string) => {
    localStorage.setItem('idony_email', email);
    if (window.fbq) window.fbq('track', 'Lead', { email });
    setShowForm(false);
    startCamera(); // continue to analysis
  };

   // Clean up camera when leaving page
  useEffect(() => {
     console.log('🧱 AnalyzePage mounted');
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      if (window.localStream) {
        try {
          window.localStream.getTracks().forEach((t) => t.stop());
        } catch {}
        window.localStream = undefined;
      }

      setReady(false);
      setCameraActive(false);
    };
  }, []);

   // ----------------------------
  // Start camera
  // ----------------------------
  const startCamera = async () => {
    if (cameraActive) {
      console.log("🔁 Camera already active, ignoring click");
      return;
    }

    console.log("🎥 Requesting camera permissions...");
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ getUserMedia resolved");

      if (!videoRef.current) {
        console.error("❌ videoRef not available after getUserMedia");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const videoEl = videoRef.current;
      window.localStream = stream;

      // Attach stream
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;

      console.log("🔗 Stream attached to <video>");

      // Wait for metadata
      await new Promise<void>((resolve) => {
        const onMeta = () => {
          videoEl.removeEventListener("loadedmetadata", onMeta);
          resolve();
        };
        if (videoEl.readyState >= 1) resolve();
        else videoEl.addEventListener("loadedmetadata", onMeta, { once: true });
      });

      console.log("ℹ️  loadedmetadata fired");

      // Try to play video
      try {
        await videoEl.play();
        console.log("▶️  Video is playing");
      } catch (playErr) {
        console.error("⚠️  video.play() was blocked:", playErr);
        await new Promise((r) => setTimeout(r, 100));
        await videoEl.play();
        console.log("▶️  Video is playing (second try)");
      }

      setCameraActive(true);
      setReady(true);
      console.log("✅ Camera active & ready");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraActive(false);
      setReady(false);

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        alert("Por favor, permite el acceso a la cámara en tu navegador.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        alert("No se encontró una cámara disponible en este dispositivo.");
      } else {
        alert("No se pudo acceder a la cámara. Verifica permisos o dispositivo.");
      }
    }
  };

  //----------------------------
  // Capture and analyze
  // ----------------------------
  const capture = async () => {
    const video = videoRef.current!;
    const visibleCanvas = canvasRef.current!;
    const ctx = visibleCanvas.getContext("2d")!;
    visibleCanvas.width = video.videoWidth;
    visibleCanvas.height = video.videoHeight;

    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    const faceLandmarker = await loadFaceLandmarker();
    const detections = faceLandmarker.detectForVideo(offscreen, performance.now());

    if (!detections.faceLandmarks?.length) {
      alert("No se detectó rostro. Intenta con mejor iluminación.");
      return;
    }

    const landmarks = detections.faceLandmarks[0];
    const { leftCheek, rightCheek, forehead, chin } = getSkinPoints(landmarks);

    const sampleAt = (normX: number, normY: number) => {
      const size = 40;
      const x = Math.round(normX * offscreen.width - size / 2);
      const y = Math.round(normY * offscreen.height - size / 2);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, size, size);
      const imgData = offCtx.getImageData(x, y, size, size);
      return averageRgb(imgData.data);
    };

    const leftRgb = sampleAt(leftCheek.x, leftCheek.y);
    const rightRgb = sampleAt(rightCheek.x, rightCheek.y);
    const foreheadRgb = sampleAt(forehead.x, forehead.y);
    const chinRgb = sampleAt(chin.x, chin.y);

    const avg: [number, number, number] = [
      (leftRgb[0] + rightRgb[0] + foreheadRgb[0] + chinRgb[0]) / 4,
      (leftRgb[1] + rightRgb[1] + foreheadRgb[1] + chinRgb[1]) / 4,
      (leftRgb[2] + rightRgb[2] + foreheadRgb[2] + chinRgb[2]) / 4,
    ];

    const skinSeason = classifyCategoryFromSkinRGB(avg);
    const season = refinarCategoria(skinSeason, ojos, cabello);
    const swatches = paletteForSeason(season);


    // 🎯 After computing averages and setting palette
    setPalette({ season, swatches });

    // 🕐 Short visual pause to let user see red squares
    await new Promise((r) => setTimeout(r, 400));

    // 🚀 Go to result (camera will stop there)
    router.push("/result");
  }
  // ✅ UI
  return (
  <main className="min-h-screen flex flex-col items-center bg-white text-black px-4 py-4 overflow-y-auto">
    {/* Header */}
    <header className="w-full text-center px-4 py-4">
  <img
    src="/Logos-01.svg"
    alt="Idony logo"
    className="w-32 sm:w-40 h-auto mx-auto mb-2 opacity-90"
  />
  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
    ANÁLISIS DE COLORIMETRÍA
  </h1>
  <p className="text-sm sm:text-base font-medium text-black mt-2">
    DESCUBRE TU PALETA ÚNICA SEGÚN TU TONO DE PIEL, OJOS Y CABELLO.
  </p>
</header>

    {/* Camera + Instructions */}
    <section className="flex flex-col items-center justify-center w-full max-w-md px-4 flex-grow">
      <div className="relative overflow-hidden bg-black border border-neutral-400 shadow-sm w-[90vw] max-w-[360px] aspect-square flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full z-[50] pointer-events-none"
          style={{ mixBlendMode: "screen" }}
        />
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? "opacity-100" : "opacity-0"
          }`}
          playsInline
          muted
          autoPlay
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 px-6">
            <p className="text-base text-neutral-100 font-semibold">
              Pulsa el botón para activar la cámara
            </p>

            {/* ✅ Instructions inside camera box */}
            <div className="text-sm text-neutral-300 leading-snug space-y-2 mt-2">
              <p>📸 Asegúrate de tener buena iluminación natural.</p>
              <p>💡 Evita luces amarillas o focos detrás de ti.</p>
              <p>🙆‍♀️ Colócate centrada/o frente a la cámara.</p>
            </div>

            <button
              onClick={handleStart}
              className="bg-white text-black font-black uppercase tracking-wide rounded-none py-2 px-6 border border-black hover:bg-black hover:text-white transition-colors mt-4"
            >
              EMPEZAR COLORIMETRÍA
            </button>
          </div>
        )}
      </div>

      {/* Inputs and Capture */}
      <div className="mt-4 w-full space-y-2 max-w-[360px]">
        <label className="block text-xs font-black uppercase text-black">COLOR DE OJOS</label>
        <select
          value={ojos}
          onChange={(e) => setOjos(e.target.value as any)}
          className="w-full rounded-none border border-neutral-400 px-3 py-2 text-black focus:ring-2 focus:ring-black focus:outline-none"
        >
          <option value="azules">Azules</option>
          <option value="grises">Grises</option>
          <option value="verdes">Verdes</option>
          <option value="avellana">Avellana</option>
          <option value="marrones">Marrones</option>
          <option value="negros">Negros</option>
        </select>

        <label className="block text-xs font-black uppercase text-black">COLOR DE CABELLO</label>
        <select
          value={cabello}
          onChange={(e) => setCabello(e.target.value as any)}
          className="w-full rounded-none border border-neutral-400 px-3 py-2 text-black focus:ring-2 focus:ring-black focus:outline-none"
        >
          <option value="rubio">Rubio</option>
          <option value="rubio-ceniza">Rubio ceniza</option>
          <option value="castaño">Castaño</option>
          <option value="negro">Negro</option>
          <option value="rojo">Rojo</option>
          <option value="dorado">Dorado</option>
        </select>

        {/* ✅ CTA inside viewport */}
        <button
          onClick={capture}
          disabled={!ready}
          className="w-full mt-3 bg-white border border-black text-black font-black uppercase tracking-wide rounded-none py-3 hover:bg-black hover:text-white transition-colors"
        >
          {ready ? "ANALIZAR MI COLORIMETRÍA" : "INICIANDO CÁMARA..."}
        </button>
        {/* ✅ Reuse your existing KlaviyoForm component */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-md p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-3 text-black text-lg font-bold"
            >
              ×
            </button>
            <KlaviyoForm onSuccess={handleFormSuccess} />
          </div>
        </div>
      )}
      </div>
    </section>
  </main>
);
}