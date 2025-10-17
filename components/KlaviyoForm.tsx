'use client';
import { useEffect, useRef, useState } from 'react';

export default function KlaviyoForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [showFallback, setShowFallback] = useState(false);
  const fallbackEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('🧱 <KlaviyoForm/> mounted');
    const init = () => {
      const ensureScript = () => {
        if (!document.querySelector('script[src*="klaviyo.com/onsite/js/klaviyo.js"]')) {
          const s = document.createElement('script');
          s.src = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=WsaZKJ';
          s.async = true;
          s.onload = () => {
            console.log('✅ Klaviyo script loaded');
            kickRender();
          };
          document.body.appendChild(s);
        } else {
          console.log('⚡ Klaviyo script already present');
          kickRender();
        }
      };

      const kickRender = () => {
        // give React time to paint the container div, then ask Klaviyo to render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              (window as any)._klOnsite = (window as any)._klOnsite || [];
              // Works for popup; also nudges embed scanning on recent versions
              (window as any)._klOnsite.push(['openForm', 'WsaZKJ']);
            } catch (e) {
              console.warn('Klaviyo openForm error', e);
            }
          });
        });

        // if no form markup appears within 1.5s, show fallback
        setTimeout(() => {
          const hasInjected = document.querySelector('.klaviyo-form-WsaZKJ form, .klaviyo-form-WsaZKJ input, .klaviyo-form-WsaZKJ [data-testid]');
          if (!hasInjected) {
            console.warn('⏳ Klaviyo did not inject UI in time — showing fallback form');
            setShowFallback(true);
          }
        }, 1500);
      };

      ensureScript();
    };

    const onSubmit = (e: any) => {
      // Klaviyo native event
      if (e?.detail?.formId === 'WsaZKJ' && e?.detail?.data?.email) {
        const email = e.detail.data.email as string;
        console.log('📧 Klaviyo form submitted', email);
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Lead', { email });
          console.log('🎯 Meta Pixel Lead fired');
        }
        onSuccess(email);
      }
    };

    document.addEventListener('klaviyoFormsSubmit', onSubmit);
    // small delay ensures this runs post-hydration
    const t = setTimeout(init, 200);

    return () => {
      clearTimeout(t);
      document.removeEventListener('klaviyoFormsSubmit', onSubmit);
    };
  }, [onSuccess]);

  // Fallback submit (stores email + fires pixel + continues), so users never get blocked
  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = fallbackEmailRef.current?.value?.trim();
    if (!email) return;
    try {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', { email });
        console.log('🎯 Meta Pixel Lead fired (fallback)');
      }
      onSuccess(email);
    } catch (err) {
      console.error('Fallback lead error:', err);
      onSuccess(email || '');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Klaviyo embed target */}
      <div className="klaviyo-form-WsaZKJ" />

      {/* Fallback (only shows if Klaviyo fails to render) */}
      {showFallback && (
        <form onSubmit={handleFallbackSubmit} className="mt-2 space-y-3">
          <label className="block text-xs font-black uppercase text-black">Tu email</label>
          <input
            ref={fallbackEmailRef}
            type="email"
            required
            placeholder="tucorreo@ejemplo.com"
            className="w-full rounded-none border border-neutral-400 px-3 py-2 text-black focus:ring-2 focus:ring-black focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-black text-white font-black uppercase tracking-wide rounded-none py-2 hover:opacity-90"
          >
            Descubrir mi paleta
          </button>
          <p className="text-xs text-neutral-500">
            (Klaviyo no se ha cargado — usando formulario directo temporal para no bloquear la experiencia)
          </p>
        </form>
      )}
    </div>
  );
}