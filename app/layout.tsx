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
        url: "/atlas-logo.png?v=5",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: ["/atlas-logo.png?v=5"],
    apple: [
      {
        url: "/atlas-logo.png?v=5",
        type: "image/png",
        sizes: "512x512",
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
