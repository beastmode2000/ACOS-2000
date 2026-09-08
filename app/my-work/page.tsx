import { Suspense } from "react";
import MyWorkClient from "./MyWorkClient";

export const dynamic = "force-dynamic";

export default function MyWorkPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading work…</div>}>
      <MyWorkClient />
    </Suspense>
  );
}
