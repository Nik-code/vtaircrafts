import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "VT Aircrafts · India commercial fleet index", template: "%s · VT Aircrafts" },
  description:
    "Every aircraft on India's scheduled and non-scheduled operator permits, drawn from DGCA's published lists and rebuilt every month.",
  metadataBase: new URL("https://vtaircrafts.in"),
  openGraph: { siteName: "VT Aircrafts", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <TopNav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
