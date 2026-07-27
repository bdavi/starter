"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@starter/auth/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return <button onClick={handleSignOut}>Sign out</button>;
}
