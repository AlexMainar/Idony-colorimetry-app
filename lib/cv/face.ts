// lib/cv/face.ts
import {
  FilesetResolver,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function loadFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO", // we are using detectForVideo
    numFaces: 1,
  });

  return faceLandmarker;
}

export function getSkinPoints(landmarks: NormalizedLandmark[]) {
    // Base landmark picks (MediaPipe FaceMesh approx indices)
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  
  // Helper to interpolate between two landmarks
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  // Derived points (stay within face area; avoid eyes/mouth)
  // Temples: halfway between forehead and cheeks
  const templeL = lerp(forehead, leftCheek, 0.55);
  const templeR = lerp(forehead, rightCheek, 0.55);

  // Nose bridge/sample along center line between forehead and chin, higher to avoid lips
  const noseBridge = lerp(forehead, chin, 0.35);

  // Mid‑cheek (closer to nose bridge than outer cheek to avoid hair/background)
  const midCheekL = lerp(leftCheek, noseBridge, 0.6);
  const midCheekR = lerp(rightCheek, noseBridge, 0.6);

  // Jawline samples slightly above chin towards each cheek
  const jawL = lerp(chin, leftCheek, 0.6);
  const jawR = lerp(chin, rightCheek, 0.6);

  // Keep backwards compatibility (existing callers use these 4)
  // Also provide a `patches` array for bulk sampling/averaging
  const patches = [
    leftCheek,
    rightCheek,
    forehead,
    chin,
    templeL,
    templeR,
    noseBridge,
    midCheekL,
    midCheekR,
    jawL,
    jawR,
  ];

  return {
    leftCheek,
    rightCheek,
    forehead,
    chin,
    // New: ordered list of sampling points
    patches,
  };
}
