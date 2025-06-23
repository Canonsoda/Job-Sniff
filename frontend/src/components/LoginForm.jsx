import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const LoginForm = () => {
  const [formData, setFormData] = useState({ emailId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    toast.dismiss(); // Close any old toasts

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("isNewUser", "true");
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || "Something went wrong during login.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        Login to JOB SNIFF
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <input
          type="email"
          name="emailId"
          placeholder="Email"
          value={formData.emailId}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg font-semibold text-sm ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="flex items-center my-4">
        <hr className="flex-grow border-white/20" />
        <span className="mx-4 text-gray-400 text-sm">or</span>
        <hr className="flex-grow border-white/20" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white text-dark font-medium rounded-lg hover:bg-gray-100 transition"
      >
        <img
          src="https://www.svgrepo.com/show/475656/google-color.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Continue with Google
      </button>

      <p className="text-sm text-gray-400 mt-4 text-center">
        Don’t have an account?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
};

export default LoginForm;
