import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // The session used to live in localStorage, which survives closing the
    // tab. It is sessionStorage now so the session ends with the tab, but a
    // token left over from the old behaviour would otherwise sit there
    // indefinitely - clear it.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isNewUser");

    const token = sessionStorage.getItem("token");
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
        const timeout = setTimeout(logout, expiry - now);
        return () => clearTimeout(timeout);
      }
    } catch {
      logout();
      toast.error("Invalid session. Please login again.");
    }
  }, [navigate]);

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isNewUser");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, logout, setUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
