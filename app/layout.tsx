import type { Metadata, Viewport } from "next";
import "./atlas-typography.css";
import "./atlas-visual-system.css";
import AtlasLocationsPolish from "./components/AtlasLocationsPolish";
import AtlasPropertyVisibility from "./components/AtlasPropertyVisibility";
import AtlasWorkspacePolish from "./components/AtlasWorkspacePolish";
import AtlasAssetReferencePolish from "./components/AtlasAssetReferencePolish";
import AtlasAssetsViewportPolish from "./components/AtlasAssetsViewportPolish";
import AtlasWorkPolish from "./components/AtlasWorkPolish";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/atlas-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/atlas-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/atlas-logo.png" />
      </head>

      <body>
        <AtlasLocationsPolish />
        <AtlasPropertyVisibility />
        <AtlasWorkspacePolish />
        <AtlasAssetReferencePolish />
        <AtlasAssetsViewportPolish />
        <AtlasWorkPolish />
        {children}
      </body>
    </html>
  );
}
