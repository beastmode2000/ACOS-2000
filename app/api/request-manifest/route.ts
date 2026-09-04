import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const propertyId = request.nextUrl.searchParams.get("propertyId")?.trim() || "";
  const isMarine = token.toLowerCase().startsWith("marine-");

  const startParams = new URLSearchParams();
  if (token) startParams.set("token", token);
  if (propertyId) startParams.set("propertyId", propertyId);

  const startUrl = startParams.size
    ? `/request?${startParams.toString()}`
    : "/request";

  const manifest = {
    id: isMarine ? "/request?app=marine" : "/request?app=requester",
    name: isMarine ? "Atlas Marine Request" : "Atlas Request",
    short_name: isMarine ? "Marine Request" : "Atlas Request",
    description: isMarine
      ? "Submit marine work requests without signing in to Atlas."
      : "Submit property requests without signing in to Atlas.",
    start_url: startUrl,
    scope: "/request",
    display: "standalone",
    background_color: "#07172f",
    theme_color: "#07172f",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/atlas-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/atlas-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
