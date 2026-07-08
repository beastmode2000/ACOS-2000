import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas 2000",
  description: "Atlas Estate Systems / 2000 private estate operations",
  applicationName: "Atlas 2000",
  manifest: "/manifest.json",
  icons: {
    icon: "/atlas-logo.png",
    apple: "/atlas-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B1E33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
