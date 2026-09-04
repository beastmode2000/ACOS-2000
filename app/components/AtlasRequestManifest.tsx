"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AtlasRequestManifest() {
  const pathname = usePathname();

  useEffect(() => {
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!manifestLink) return;

    const previousManifest = manifestLink.getAttribute("href") || "/manifest.json";
    const previousAppleTitle = appleTitle?.getAttribute("content") || "Atlas";

    if (pathname !== "/request") {
      manifestLink.setAttribute("href", "/manifest.json");
      if (appleTitle) appleTitle.setAttribute("content", "Atlas");
      return;
    }

    const currentUrl = new URL(window.location.href);
    const token = currentUrl.searchParams.get("token")?.trim() || "";
    const propertyId = currentUrl.searchParams.get("propertyId")?.trim() || "";

    if (!token) {
      manifestLink.setAttribute("href", "/manifest.json");
      return;
    }

    const params = new URLSearchParams({ token });
    if (propertyId) params.set("propertyId", propertyId);

    manifestLink.setAttribute("href", `/api/request-manifest?${params.toString()}`);
    if (appleTitle) appleTitle.setAttribute("content", "Atlas Request");

    return () => {
      manifestLink.setAttribute("href", previousManifest);
      if (appleTitle) appleTitle.setAttribute("content", previousAppleTitle);
    };
  }, [pathname]);

  return null;
}
