"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "renter",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setMessage("");
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

  function handleRegisterChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setError(data.message || "Registration failed.");
        return;
      }

      setEmail(form.email);
      setPassword("");
      setMessage("Account created successfully! Please log in.");

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "renter",
      });

      setMode("login");
    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>
          Rent<span style={{ color: "#43cdb8" }}>Mate</span>
        </h1>

        <p style={styles.subtitle}>
          {mode === "login"
            ? "Welcome back! Sign in to your account."
            : "Create an account and join RentMate."}
        </p>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => switchMode("login")}
            style={{
              ...styles.tab,
              ...(mode === "login" ? styles.activeTab : {}),
            }}
          >
            Log in
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            style={{
              ...styles.tab,
              ...(mode === "register" ? styles.activeTab : {}),
            }}
          >
            Create account
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <label style={styles.label} htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />

            <label style={styles.label} htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {message && <div style={styles.success}>{message}</div>}
            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? "Signing in..." : "Log in"}
            </button>

            <p style={styles.footer}>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={styles.linkButton}
              >
                Create account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label style={styles.label} htmlFor="register-name">
              Full name
            </label>

            <input
              id="register-name"
              style={styles.input}
              name="name"
              value={form.name}
              onChange={handleRegisterChange}
              placeholder="Enter your name"
              maxLength={100}
              required
            />

            <label style={styles.label} htmlFor="register-email">
              Email address
            </label>

            <input
              id="register-email"
              style={styles.input}
              type="email"
              name="email"
              value={form.email}
              onChange={handleRegisterChange}
              placeholder="Enter your email"
              maxLength={100}
              required
            />

            <label style={styles.label} htmlFor="register-phone">
              Phone number (optional)
            </label>

            <input
              id="register-phone"
              style={styles.input}
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleRegisterChange}
              placeholder="Enter your phone number"
            />

            <label style={styles.label} htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              style={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleRegisterChange}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />

            <label style={styles.label} htmlFor="register-role">
              Choose account type
            </label>

            <select
              id="register-role"
              style={styles.input}
              name="role"
              value={form.role}
              onChange={handleRegisterChange}
            >
              <option value="renter">
                Renter – I want to rent equipment
              </option>
              <option value="owner">
                Owner – I want to list equipment
              </option>
              <option value="both">
                Both – Rent and list equipment
              </option>
            </select>

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p style={styles.footer}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={styles.linkButton}
              >
                Log in
              </button>
            </p>
          </form>
        )}

        <p style={styles.bottomText}>
          Peer-to-Peer Equipment Rental Platform
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f6fc",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    boxSizing: "border-box",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(23, 48, 82, 0.10)",
    border: "1px solid #e2e8f0",
  },

  heading: {
    color: "#173052",
    fontSize: "30px",
    fontWeight: "800",
    margin: "0 0 8px",
  },

  subtitle: {
    color: "#64748b",
    fontSize: "14px",
    margin: "0 0 22px",
    lineHeight: 1.5,
  },

  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    padding: "4px",
    background: "#f1f5f9",
    borderRadius: "9px",
  },

  tab: {
    flex: 1,
    padding: "11px 6px",
    border: "none",
    borderRadius: "7px",
    background: "transparent",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  activeTab: {
    background: "#43cdb8",
    color: "#10263f",
  },

  label: {
    display: "block",
    color: "#173052",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "7px",
    marginTop: "15px",
  },

  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    margin: "0 0 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#173052",
    background: "#ffffff",
    outlineColor: "#43cdb8",
  },

  button: {
    width: "100%",
    padding: "13px",
    marginTop: "12px",
    background: "#43cdb8",
    color: "#10263f",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "11px",
    marginTop: "8px",
    fontSize: "13px",
  },

  success: {
    color: "#087b68",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: "8px",
    padding: "11px",
    marginTop: "8px",
    fontSize: "13px",
  },

  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    margin: "22px 0 0",
  },

  linkButton: {
    background: "none",
    border: "none",
    color: "#159d89",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
  },

  bottomText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
    margin: "24px 0 0",
  },
};
