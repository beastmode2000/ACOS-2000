import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atlas Request",
  description: "Submit a property request without signing in to Atlas.",
  applicationName: "Atlas Request",
  manifest: null,
  appleWebApp: {
    capable: true,
    title: "Atlas Request",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/atlas-logo.png",
    shortcut: "/atlas-logo.png",
    apple: "/atlas-logo.png",
  },
};

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
