import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");

    if (token) {
      localStorage.setItem("token", token);

      try {
        const decoded = jwtDecode(token);
        if (decoded?.isNewUser) {
          localStorage.setItem("isNewUser", "true");
          navigate("/choose-role");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Token decode error:", err);
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return null;
};

export default GoogleAuthSuccess;
