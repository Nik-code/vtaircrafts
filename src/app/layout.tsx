import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "VT Aircrafts · India commercial fleet index", template: "%s · VT Aircrafts" },
  description:
    "Every aircraft on India's scheduled and non-scheduled operator permits, drawn from DGCA's published lists and rebuilt every month.",
  metadataBase: new URL("https://vtaircrafts.in"),
  openGraph: {
    siteName: "VT Aircrafts",
    type: "website",
    url: "https://vtaircrafts.in",
    title: "VT Aircrafts · India commercial fleet index",
    description: "Every aircraft on India's scheduled and non-scheduled operator permits, one mark each, rebuilt monthly from DGCA's lists.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "VT Aircrafts: the Indian commercial fleet, one mark per aircraft" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VT Aircrafts · India commercial fleet index",
    description: "Every aircraft on India's scheduled and non-scheduled operator permits, one mark each, rebuilt monthly from DGCA's lists.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Apply a stored theme before first paint; dark is the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('vt-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <TopNav />
        <div className="flex-1">{children}</div>
        <Footer />
        <Script
          defer
          src="https://analytics.priyanshnik.com/script.js"
          data-website-id="873ca215-e9e7-4218-97b6-b8366ceccbdc"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
