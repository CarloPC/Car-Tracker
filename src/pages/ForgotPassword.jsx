import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, authErrorMessage } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Enter the email you signed up with.");

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Don't reveal whether an email exists — show success either way,
      // except for genuinely malformed addresses.
      if (err?.code === "auth/invalid-email") setError(authErrorMessage(err));
      else setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to set a new one"
      footer={
        <Link to="/login" className="font-semibold" style={{ color: "var(--color-amber)" }}>
          Back to login
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--color-teal-dim)", color: "var(--color-teal)" }}>
          If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </Field>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-coral)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--color-amber)", color: "#14171c" }}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
