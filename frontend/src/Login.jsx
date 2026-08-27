import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      let response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (response.status === 422) {
        const formData = new URLSearchParams();

        formData.append("username", email);
        formData.append("password", password);

        response = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Invalid email or password."
        );
      }

      const token =
        data.access_token ||
        data.token ||
        data.accessToken;

      if (!token) {
        throw new Error(
          "Login succeeded, but the server did not return an access token."
        );
      }

      const user = data.user || {
        employee_id: data.employee_id,
        email: data.email,
        role: data.role,
        name: data.name || (data.role === "admin" ? "Administrator" : "User"),
        designation: data.designation || "",
        department: data.department || "",
        status: data.status ?? true,
      };

      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin({
        ...data,
        user,
      });
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError(loginError.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <div className="logo-icon">◉</div>
          <h1>FaceSecure AI</h1>
          <p>Intelligent Face Recognition System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@facesecure.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">
          Secure authentication powered by FaceSecure AI
        </p>
      </section>
    </main>
  );
}

export default Login;