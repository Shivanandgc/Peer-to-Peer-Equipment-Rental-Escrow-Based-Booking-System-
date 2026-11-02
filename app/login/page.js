
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f6fc",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "420px",
          boxSizing: "border-box",
          background: "#ffffff",
          padding: "36px",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(23, 48, 82, 0.10)",
          border: "1px solid #e2e8f0",
        }}
      >
        <h1
          style={{
            color: "#173052",
            fontSize: "32px",
            fontWeight: "800",
            margin: "0 0 8px",
          }}
        >
          Rent<span style={{ color: "#43cdb8" }}>Mate</span>
        </h1>

        <p
          style={{
            color: "#64748b",
            fontSize: "15px",
            margin: "0 0 28px",
            lineHeight: 1.5,
          }}
        >
          Welcome back! Sign in to your account.
        </p>

        <label
          htmlFor="email"
          style={labelStyle}
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          autoComplete="email"
          autoFocus
          style={inputStyle}
        />

        <label
          htmlFor="password"
          style={labelStyle}
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          style={inputStyle}
        />

        {error && (
          <div
            role="alert"
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px",
              marginTop: "8px",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            marginTop: "22px",
            background: loading ? "#94a3b8" : "#43cdb8",
            color: "#10263f",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loading ? "Signing in..." : "Log in"}
        </button>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
            margin: "22px 0 0",
          }}
        >
          Peer-to-Peer Equipment Rental Platform
        </p>
      </form>
    </main>
  );
}

const labelStyle = {
  display: "block",
  color: "#173052",
  fontSize: "14px",
  fontWeight: "600",
  marginBottom: "8px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  margin: "0 0 22px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "15px",
  color: "#173052",
  background: "#ffffff",
  outlineColor: "#43cdb8",
};
