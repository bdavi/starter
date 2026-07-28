import Link from "next/link";

export default function Index() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-bold">SaaS Starter</span>
        <nav className="flex gap-2">
          <Link href="/sign-in" className="rounded border px-3 py-1">
            Log in
          </Link>
          <Link
            href="/sign-in"
            className="rounded bg-black px-3 py-1 text-white"
          >
            Sign up
          </Link>
        </nav>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-4xl font-bold">Hello, world</h1>
      </div>
    </main>
  );
}
