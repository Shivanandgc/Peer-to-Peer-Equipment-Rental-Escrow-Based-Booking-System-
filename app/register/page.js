
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "renter",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed.");
        return;
      }

      setMessage("Account created successfully! Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.heading}>
          Create <span style={{ color: "#40cdb5" }}>Account</span>
        </h1>

        <p style={styles.subtitle}>
          Join RentMate and start renting or listing equipment.
        </p>

        <label style={styles.label}>Full name</label>
        <input
          style={styles.input}
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your name"
          maxLength={100}
          required
        />

        <label style={styles.label}>Email address</label>
        <input
          style={styles.input}
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          maxLength={100}
          required
        />

        <label style={styles.label}>Phone number (optional)</label>
        <input
          style={styles.input}
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimum 8 characters"
          minLength={8}
          required
        />

        <label style={styles.label}>Choose account type</label>
        <select
          style={styles.input}
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="renter">Renter – I want to rent equipment</option>
          <option value="owner">Owner – I want to list equipment</option>
          <option value="both">Both – Rent and list equipment</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f2f5fc",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 8px 30px rgba(20, 40, 70, 0.10)",
  },
  heading: {
    fontSize: "27px",
    color: "#142943",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#60728c",
    marginBottom: "24px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#142943",
    marginBottom: "7px",
    marginTop: "15px",
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1dced",
    borderRadius: "7px",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff",
  },
  button: {
    width: "100%",
    padding: "13px",
    marginTop: "24px",
    background: "#40cdb5",
    color: "#082b37",
    border: "none",
    borderRadius: "7px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  message: {
    fontSize: "13px",
    color: "#087b68",
    marginTop: "15px",
  },
  footer: {
    textAlign: "center",
    fontSize: "13px",
    color: "#60728c",
    marginTop: "20px",
  },
  link: {
    color: "#159d89",
    fontWeight: "bold",
    textDecoration: "none",
  },
};
