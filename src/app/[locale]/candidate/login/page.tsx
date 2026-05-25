import Link from "next/link";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CandidateLoginPage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Candidate Login
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to manage your Voters&apos; Guide submissions
          </p>
        </div>

        <form className="mt-8 space-y-6" method="POST" action="/api/auth/login">
          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field mt-1"
              placeholder="candidate@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-field mt-1"
            />
          </div>

          <div>
            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link
            href={`/${locale}/candidate/register`}
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}