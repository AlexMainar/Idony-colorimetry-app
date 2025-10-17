'use client';
import { useEffect } from 'react';

export default function KlaviyoForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  useEffect(() => {
    const initKlaviyo = () => {
      // Load script if not already loaded
      if (!document.querySelector('script[src*="klaviyo.com/onsite/js/klaviyo.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=WsaZKJ';
        script.async = true;
        script.onload = () => {
          console.log('✅ Klaviyo script loaded');
          window._klOnsite = window._klOnsite || [];
          // 🔥 Force Klaviyo to initialize and render the form explicitly
          window._klOnsite.push(['openForm', 'WsaZKJ']);
        };
        document.body.appendChild(script);
      } else {
        console.log('⚡ Klaviyo script already present');
        window._klOnsite = window._klOnsite || [];
        window._klOnsite.push(['openForm', 'WsaZKJ']);
      }
    };

    // Attach listener for successful form submission
    const handler = (e: any) => {
      if (e.detail?.formId === 'WsaZKJ' && e.detail?.data?.email) {
        const email = e.detail.data.email;
        console.log('📧 Klaviyo form submitted', email);
        onSuccess(email);
      }
    };
    document.addEventListener('klaviyoFormsSubmit', handler);

    // Delay initialization slightly for hydration
    const timeout = setTimeout(initKlaviyo, 800);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('klaviyoFormsSubmit', handler);
    };
  }, [onSuccess]);

  // Important: The wrapper needs to exist before initialization
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="klaviyo-form-WsaZKJ"></div>
    </div>
  );
}