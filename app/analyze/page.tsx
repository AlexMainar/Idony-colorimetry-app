"use client";
import { useState } from "react";

export default function AnalyzePage() {
  const [hasFile, setHasFile] = useState(false);
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 space-y-6">
      <h1 className="text-3xl font-bold uppercase">Discover Your Colorimetry</h1>
      <p className="text-gray-600">Upload a photo or use your camera to begin.</p>
      <input type="file" accept="image/*" className="border rounded p-2"
        onChange={(e) => setHasFile(!!e.target.files?.length)} />
      <button
        onClick={() => (window.location.href = "/result")}
        disabled={!hasFile}
        className="bg-black text-white px-6 py-2 rounded-lg disabled:opacity-50"
      >
        See My Palette →
      </button>
    </main>
  );
}