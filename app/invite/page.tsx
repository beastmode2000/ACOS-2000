import { Suspense } from "react";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InviteForm />
    </Suspense>
  );
}
