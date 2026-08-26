import { useState } from "react";
import Login from "./Login.jsx";
import FaceAuthentication from "./FaceAuthentication.jsx";
import AdminDashboard from "./AdminDashboard.jsx";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

function App() {
  const [user, setUser] = useState(getSavedUser);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleLogin = (loginData) => {
    const authenticatedUser = loginData.user || {
      employee_id: loginData.employee_id,
      email: loginData.email,
      role: loginData.role,
      name: loginData.name || "User",
      designation: loginData.designation || "",
      department: loginData.department || "",
      status: loginData.status ?? true,
    };

    localStorage.setItem("user", JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setShowEmailLogin(false);
  };

  if (!user) {
    if (showEmailLogin) {
      return (
        <Login
          onLogin={handleLogin}
          onBackToFace={() => setShowEmailLogin(false)}
        />
      );
    }

    return (
      <FaceAuthentication
        onLogin={handleLogin}
        onUseEmailLogin={() => setShowEmailLogin(true)}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>FaceSecure AI</h1>
          <p>Intelligent Face Recognition System</p>
        </div>

        <div className="header-actions">
          <div className="status">
            <span className="status-dot active" />
            {user.role === "admin"
              ? "Admin Authenticated"
              : "User Authenticated"}
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {user.role === "admin" ? (
        <AdminDashboard />
      ) : (
        <main className="access-page">
          <section className="access-card">
            <div className="access-icon">✓</div>
            <h2>Welcome, {user.name || user.email}</h2>
            <p>You are authenticated successfully.</p>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;