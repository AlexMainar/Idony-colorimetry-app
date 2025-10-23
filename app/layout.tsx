import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"], // incluye el black real
  display: "swap",
});

export const metadata: Metadata = {
  title: "Colorimetría Idony",
  description: "Descubre tu paleta única según tu tono de piel, ojos y cabello.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <Script id="klaviyo-init" strategy="afterInteractive">
          {`
    window.klaviyo = window.klaviyo || {
      identify: function(){},
      track: function(){}
    };
    console.log("✅ Klaviyo API initialized for custom integration mode.");
  `}
        </Script>
        {/* ✅ Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '565199726115945');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>

      <body className={`${inter.className} antialiased bg-white text-black`}>
        {children}
      </body>
    </html>
  );
}