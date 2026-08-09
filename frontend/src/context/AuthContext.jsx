import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Declared before the effect that uses it, and memoised on `navigate`, so the
  // effect can list it as a dependency without re-running on every render. The
  // effect previously closed over a `logout` that was redefined each render and
  // omitted from the dependency array.
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const expiry = decoded.exp * 1000;
      const now = Date.now();

      if (now >= expiry) {
        logout();
        toast.error("Session expired");
      } else {
        setUser(decoded);
        // Log the user out the moment the token expires, rather than leaving a
        // dead session on screen until the next API call fails
        const timeout = setTimeout(logout, expiry - now);
        return () => clearTimeout(timeout);
      }
    } catch {
      logout();
      toast.error("Invalid session. Please login again.");
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, logout, setUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Colocating the consumer hook with its provider is the idiomatic pattern; the
// only cost is that this file exports a non-component, which disables Fast
// Refresh for it. Accepted deliberately rather than split across two files.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
