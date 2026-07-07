import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas Estate Systems for 2000.",
  applicationName: "Atlas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Atlas",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/atlas-logo.png",
    shortcut: "/atlas-logo.png",
    apple: "/atlas-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B1E33",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
