import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas property systems",
  applicationName: "Atlas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=3",
        sizes: "any",
      },
      {
        url: "/atlas-icon.png?v=3",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: ["/favicon.ico?v=3"],
    apple: [
      {
        url: "/apple-touch-icon.png?v=3",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
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
