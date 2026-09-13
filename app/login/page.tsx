import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-2xl text-ink-900">Welcome back</h1>

      <Suspense fallback={<p className="mt-6 text-sm text-ink-500">Loading…</p>}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-center text-sm text-ink-500">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-medium text-brass-600 hover:underline">
          Sign up
        </a>
      </p>
    </main>
  );
}
