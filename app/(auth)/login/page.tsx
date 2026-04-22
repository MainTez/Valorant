import { Suspense } from "react";
import { LoginCard } from "./login-card";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="relative z-10 min-h-screen w-full max-w-full overflow-x-hidden">
      <section className="flex min-h-screen items-center justify-center">
        <Suspense fallback={null}>
          <LoginCard searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
