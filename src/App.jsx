import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Pantry from "./pages/Pantry";
import RecipeFinder from "./pages/RecipeFinder";
import SavedRecipes from "./pages/SavedRecipes";
import "./AppShell.css";

function NavBar({ onSignOut }) {
  return (
    <nav className="app-nav">
      <span className="app-nav-brand">Larder</span>
      <div className="app-nav-links">
        <NavLink to="/pantry" className={({ isActive }) => (isActive ? "app-nav-link-active" : "")}>
          Pantry
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => (isActive ? "app-nav-link-active" : "")}>
          Find recipes
        </NavLink>
        <NavLink to="/saved" className={({ isActive }) => (isActive ? "app-nav-link-active" : "")}>
          Saved
        </NavLink>
        <button className="app-nav-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--steel)", fontFamily: "var(--font-body)" }}>Loading…</p>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <NavBar onSignOut={signOut} />
      <Routes>
        <Route path="/pantry" element={<Pantry />} />
        <Route path="/recipes" element={<RecipeFinder />} />
        <Route path="/saved" element={<SavedRecipes />} />
        <Route path="*" element={<Navigate to="/pantry" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
