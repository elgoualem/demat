"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { register, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await register(email, name);
      login(res.token, res.user);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Cet email est déjà inscrit.");
      } else {
        setError("Inscription impossible.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="form-page">
      <h1>Inscription</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Nom
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Inscription…" : "S'inscrire"}
        </button>
      </form>
    </div>
  );
}
