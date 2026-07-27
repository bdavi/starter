import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@starter/auth/server";

import { SignOutButton } from "./sign-out-button";

// Minimal, unstyled proof-of-wiring for ADR-00012's session model. The
// actual session check happens here, server-side, in the page itself —
// not in middleware/proxy. Next.js 16 renamed middleware to `proxy` and
// explicitly discourages database calls there (it's meant to stay a thin
// layer for redirects/rewrites); a DB-backed session lookup belongs in the
// Server Component that actually needs it.
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Signed in as {session.user.email}</p>
      <SignOutButton />
    </main>
  );
}
