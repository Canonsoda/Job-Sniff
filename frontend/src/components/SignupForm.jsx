import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const SignupForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    emailId: "",
    password: "",
  });

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

    const { name, emailId, password } = formData;

    if (!name || !emailId || !password) {
      toast.error("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        user: formData,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("isNewUser", "true");

      toast.success("Signup successful!");
      navigate("/choose-role"); // 👈 Ask user their role here
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-center mb-6 text-white">Create an account</h2>

      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <input
          type="email"
          name="emailId"
          placeholder="Email"
          value={formData.emailId}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-lg font-semibold text-sm ${
            loading ? "bg-gray-500 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
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
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
        Continue with Google
      </button>

      <p className="text-sm text-gray-400 mt-4 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
};

export default SignupForm;
