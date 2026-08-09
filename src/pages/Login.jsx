import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const action = mode === "signin" ? signIn(email, password) : signUp(email, password);
    const { error: authError } = await action;

    setSubmitting(false);
    if (authError) {
      setError(authError.message);
    } else if (mode === "signup") {
      setMessage("Account created. Check your email to confirm, then sign in.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-eyebrow">Larder</p>
        <h1 className="login-title">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-message">{message}</p>}
          <button type="submit" className="btn-primary login-submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          className="login-toggle"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
