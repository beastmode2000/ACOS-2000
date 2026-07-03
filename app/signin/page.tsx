import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SignInForm } from "@/components/signin-form"

export const dynamic = "force-dynamic"

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) {
    redirect("/")
  }
  return <SignInForm />
}
