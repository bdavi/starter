"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@starter/auth/client";

// Minimal, unstyled proof-of-wiring for ADR-00012 — matches this app's
// current placeholder-level polish. Not real UX.
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: signInError } = await signIn.email({ email, password });
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    router.push("/dashboard");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: signUpError } = await signUp.email({
      email,
      password,
      name,
    });
    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Name (sign up only)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" onClick={handleSignIn}>
            Sign in
          </button>
          <button type="submit" onClick={handleSignUp}>
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
