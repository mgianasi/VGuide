"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, FormEvent } from "react";

export default function CandidateRegisterPage() {
  const { locale } = useParams<{ locale: string }>();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [captcha, setCaptcha] = useState({
    id: "",
    question: "",
    answer: "",
    token: "",
    loaded: false,
    error: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadCaptcha(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): string | null {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!email.trim()) return "Email is required.";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim()))
      return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!captcha.token) return "Please complete the CAPTCHA.";
    return null;
  }

  async function loadCaptcha() {
    try {
      setCaptcha((prev) => ({ ...prev, loaded: false, error: "" }));
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      if (data.captchaId && data.question) {
        setCaptcha({
          id: data.captchaId,
          question: data.question,
          answer: "",
          token: "",
          loaded: true,
          error: "",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "CAPTCHA load failed.";
      setCaptcha((prev) => ({ ...prev, error: message }));
    }
  }

  async function verifyCaptcha() {
    if ((captcha.answer.trim() === "")) return;
    try {
      const res = await fetch("/api/auth/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ __captcha_token: captcha.id, answer: captcha.answer }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(data?.error || "CAPTCHA verification failed");
      }
      setCaptcha((prev) => ({ ...prev, token: data.payload ?? "" }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "CAPTCHA verification failed.";
      setCaptcha((prev) => ({ ...prev, token: "", error: message }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: formData.phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message ||
            data?.error ||
            "Registration failed. Please try again.",
        );
      }

      setSuccess(
        "Your account has been created successfully! You can now sign in.",
      );
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Candidate Registration
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Create an account to manage your Voters&apos; Guide submissions
          </p>
        </div>

        {success && (
          <div className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-800">
            {success}{" "}
            <Link
              href={`/${locale}/candidate/login`}
              className="font-medium text-green-700 underline hover:text-green-600"
            >
              Sign in here
            </Link>
          </div>
        )}

        {!success && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="label">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  className="input-field mt-1"
                  placeholder="Jane"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="label">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  className="input-field mt-1"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

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
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Phone <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="input-field mt-1"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
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
                autoComplete="new-password"
                required
                className="input-field mt-1"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="input-field mt-1"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-3">
              {!captcha.token && (
                <div className="space-y-2">
                  {captcha.loaded ? (
                    <>
                      <p className="text-sm font-medium">{captcha.question}</p>
                      <input
                        id="captcha-answer"
                        name="captchaAnswer"
                        type="text"
                        inputMode="numeric"
                        className="input-field"
                        placeholder="Answer"
                        value={captcha.answer}
                        onChange={(e) => setCaptcha((prev) => ({ ...prev, answer: e.target.value }))}
                        onBlur={verifyCaptcha}
                      />
                      {captcha.error && (
                        <p className="text-sm text-red-600">{captcha.error}</p>
                      )}
                      {captcha.token && (
                        <p className="text-sm text-green-700">
                          CAPTCHA verified successfully.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-neutral-500">Loading CAPTCHA…</p>
                  )}
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="text-sm text-primary-600 underline"
                  >
                    Refresh CAPTCHA
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href={`/${locale}/candidate/login`}
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
