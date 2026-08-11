import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Addison | Atlas",
  description: "Addison's Atlas tasks and routine.",
  applicationName: "Atlas Addison",
  manifest: "/addison-manifest.json",
  appleWebApp: {
    capable: true,
    title: "Addison",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#071B2F",
};

export default function AddisonWorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

