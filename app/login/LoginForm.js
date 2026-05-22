"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function isAllowedEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith("@umm.edu");
}

export default function LoginForm({ nextPath = "/" }) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [message, setMessage] = useState("Enter your @umm.edu email to receive a one-time code.");
  const [loading, setLoading] = useState(false);

  async function sendCode(event) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      setMessage("Access is limited to @umm.edu email addresses.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setStep("code");
    setMessage("A one-time code/sign-in link was sent to your email.");
  }

  async function verifyCode(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      setMessage("Access is limited to @umm.edu email addresses.");
      return;
    }

    if (!code.trim()) {
      setMessage("Enter the one-time code from your email.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code.trim(),
      type: "email"
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <section className="loginCard">
      <h1>UMMS Formulary Search</h1>
      <p className="subtitle">Secure access for @umm.edu users</p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="loginForm">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="name@umm.edu"
              autoFocus
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Sending..." : "Send one-time code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="loginForm">
          <label>
            Email address
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} />
          </label>
          <label>
            One-time code
            <input
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder="Enter code"
              autoFocus
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify and continue"}</button>
          <button type="button" className="secondaryButton" onClick={() => setStep("email")}>Use a different email</button>
        </form>
      )}

      <p className="helper">{message}</p>
    </section>
  );
}
