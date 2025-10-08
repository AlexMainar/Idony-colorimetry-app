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

export default function AnalyzePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const setPalette = useAppStore((s) => s.setPalette);

  const [ojos, setOjos] = useState<
    "azules" | "grises" | "verdes" | "avellana" | "marrones" | "negros"
  >("marrones");

  const [cabello, setCabello] = useState<
    "rubio" | "rubio-ceniza" | "castaño" | "negro" | "rojo" | "dorado"
  >("rubio-ceniza");

  // ----------------------------
  // Cámara
  // ----------------------------
  useEffect(() => {
    let stream: MediaStream;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);

          // Warm-up modelo
          const faceLandmarker = await loadFaceLandmarker();
          faceLandmarker.detectForVideo(videoRef.current!, performance.now());
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  // ----------------------------
  // Captura
  // ----------------------------
 const capture = async () => {
  const video = videoRef.current!;
  const visibleCanvas = canvasRef.current!;
  const ctx = visibleCanvas.getContext("2d")!;
  visibleCanvas.width = video.videoWidth;
  visibleCanvas.height = video.videoHeight;

  // 🧊 Freeze video visually (no reflow)
  video.style.transition = "none";
  video.style.transform = "scale(1)";
  video.style.objectFit = "cover";

  // 🪞 Create an offscreen canvas for detection
  const offscreen = document.createElement("canvas");
  offscreen.width = video.videoWidth;
  offscreen.height = video.videoHeight;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

  // ⚡ Optional flash
  const flash = document.createElement("div");
  flash.style.position = "fixed";
  flash.style.top = "0";
  flash.style.left = "0";
  flash.style.width = "100vw";
  flash.style.height = "100vh";
  flash.style.background = "white";
  flash.style.opacity = "0.8";
  flash.style.transition = "opacity 0.3s ease";
  document.body.appendChild(flash);
  setTimeout(() => (flash.style.opacity = "0"), 50);
  setTimeout(() => flash.remove(), 350);

  // 🧠 Run face detection on the offscreen canvas (keeps visible video intact)
  const faceLandmarker = await loadFaceLandmarker();
  const timestamp = performance.now();
  const detections = faceLandmarker.detectForVideo(offscreen, timestamp);

  if (!detections.faceLandmarks?.length) {
    alert("No se detectó rostro. Intenta con mejor iluminación.");
    return;
  }

  const landmarks = detections.faceLandmarks[0];
  const { leftCheek, rightCheek, forehead, chin } = getSkinPoints(landmarks);

  function sampleAt(normX: number, normY: number) {
    const size = 40;
    const x = Math.round(normX * offscreen.width - size / 2);
    const y = Math.round(normY * offscreen.height - size / 2);

    // 🔴 draw red squares on visible canvas (debug only)
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
    setTimeout(() => ctx.clearRect(x, y, size, size), 500);

    const imgData = offCtx.getImageData(x, y, size, size);
    return averageRgb(imgData.data);
  }

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

  setPalette({ season, swatches });

  // ✨ Smooth fade transition
  document.body.classList.add("fade-out");
  setTimeout(() => {
    router.push("/result");
    document.body.classList.remove("fade-out");
  }, 300);
};

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <main className="min-h-dvh flex flex-col items-center bg-white text-black">
      {/* Header */}
      <header className="w-full flex justify-start px-6 py-4">
        <img
          src="/Logos-01.svg"
          alt="Idony logo"
          className="w-40 h-auto opacity-90"
        />
      </header>

      {/* Hero Section */}
      <section className="text-center mt-6 mb-8 px-6">
        <h1 className="text-4xl font-black tracking-tight">
          Guía de colorimetría
        </h1>
        <p className="text-sm text-neutral-500 font-light mt-1">
          Descubre tu paleta única según tu tono de piel, ojos y cabello.
        </p>
      </section>

      {/* Camera Section */}
      <div className="space-y-4 max-w-md w-full px-6">
        <div
          className="relative rounded-2xl overflow-hidden bg-black border border-neutral-200 shadow-sm will-change-transform"
          style={{ aspectRatio: "3 / 4", height: "480px" }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>

        {/* Inputs */}
        <div className="space-y-3 mt-4">
          <label className="block text-sm font-medium text-neutral-600">
            Color de ojos
          </label>
          <select
            value={ojos}
            onChange={(e) => setOjos(e.target.value as any)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-800 focus:ring-2 focus:ring-[#D94E37] focus:outline-none"
          >
            <option value="azules">Azules</option>
            <option value="grises">Grises</option>
            <option value="verdes">Verdes</option>
            <option value="avellana">Avellana</option>
            <option value="marrones">Marrones</option>
            <option value="negros">Negros</option>
          </select>

          <label className="block text-sm font-medium text-neutral-600">
            Color de cabello
          </label>
          <select
            value={cabello}
            onChange={(e) => setCabello(e.target.value as any)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-800 focus:ring-2 focus:ring-[#D94E37] focus:outline-none"
          >
            <option value="rubio">Rubio</option>
            <option value="rubio-ceniza">Rubio ceniza</option>
            <option value="castaño">Castaño</option>
            <option value="negro">Negro</option>
            <option value="rojo">Rojo</option>
            <option value="dorado">Dorado</option>
          </select>
        </div>

        {/* Button */}
        <button
          onClick={capture}
          disabled={!ready}
          className="w-full mt-6 bg-[#D94E37] text-white font-medium tracking-wide rounded-xl py-3 uppercase disabled:opacity-40 transition-opacity"
        >
          {ready ? "Analizar mi colorimetría" : "Iniciando cámara..."}
        </button>
      </div>
    </main>
  );
}