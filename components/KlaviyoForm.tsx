"use client";
import { useEffect, useState } from "react";

interface KlaviyoFormProps {
  onSuccess?: (email: string) => void;
}

export default function KlaviyoForm({ onSuccess }: KlaviyoFormProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    // ✅ Initialize Klaviyo API if available
    if (typeof window !== "undefined" && window.klaviyo) {
      console.log("🧩 Klaviyo API available — ready to track events");
    } else {
      console.warn("⚠️ Klaviyo API not detected — ensure klaviyo.js is loaded in layout.tsx");
    }
  }, []);
  // 🧠 Skip form if user already subscribed
  useEffect(() => {
    const savedEmail =
      localStorage.getItem("idony_email") ||
      document.cookie.split("; ").find((r) => r.startsWith("idony_email="))?.split("=")[1];

    if (savedEmail) {
      console.log("📧 Existing user detected:", savedEmail);
      onSuccess?.(savedEmail);
    }
  }, [onSuccess]);

  // 🔘 Called when the user submits their email (for testing / manual trigger)
  const handleSubmit = async (email: string) => {
    if (!email) return;
    // 🔥 Send Meta Pixel "Lead" event
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead", { email });
      console.log("📡 Meta Pixel Lead event fired");
    }
    try {
      const response = await fetch("/api/klaviyo/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, consent }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("idony_email", email);
        document.cookie = `idony_email=${encodeURIComponent(email)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      onSuccess?.(email);
      console.log("✅ Backend profile creation succeeded");
    } catch (err) {
      console.error("❌ Error sending event to backend:", err);
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = document.getElementById("klaviyo-email") as HTMLInputElement;
        const checkbox = document.getElementById("klaviyo-consent") as HTMLInputElement;
        if (input?.value) {
          setConsent(checkbox?.checked || false);
          handleSubmit(input.value);
        }
      }}
      className="w-full max-w-lg mx-auto flex flex-col items-center bg-white p-6 space-y-4 border border-gray-200"
    >
      {/* Email input */}
      <input
        type="email"
        id="klaviyo-email"
        placeholder="Email"
        required
        className="w-full border border-[#B4BBC3] focus:border-black px-3 py-3 text-[16px] font-normal text-black placeholder-[#767676] outline-none h-[50px]"
      />

      {/* Checkbox */}
      <label className="flex items-center space-x-2 w-full text-sm text-black">
        <input type="checkbox" id="klaviyo-consent" className="accent-[#D84139]" defaultChecked />
        <span>Sí, quiero recibir novedades y ofertas exclusivas de Idony.</span>
      </label>

      {/* Submit button */}

      <button
        type="submit"
        className="w-full bg-[#D84139] text-white font-bold uppercase py-3 tracking-wide hover:bg-[#b9372e] transition"
      >
        Obtener tus resultados
      </button>

      {/* Legal note */}
      <p className="text-[11px] text-gray-500 text-center leading-tight max-w-md">
        Al suscribirte aceptas recibir novedades y ofertas exclusivas de Idony por email, conforme a
        nuestra{" "}
        <a href="https://idonycosmetics.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-[#0066CC]">
          Política de Privacidad
        </a>
        . Puedes darte de baja en cualquier momento.
      </p>
    </form>
  );
}