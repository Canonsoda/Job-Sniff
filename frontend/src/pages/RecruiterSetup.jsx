import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext"; // ✅ Import useAuth

const RecruiterSetup = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    jobTitle: "",
    phoneNumber: "",
    companyWebsite: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth(); // ✅ Access setUser from context
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE_URL}/auth/update-recruiter-details`,
        { recruiterDetails: formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Save new token and update user context
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);

      toast.success("Recruiter profile setup complete!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-white space-y-6">
        <h2 className="text-2xl font-bold text-center">Recruiter Setup</h2>
        <p className="text-center text-gray-400">Help us personalize your experience</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="companyName"
            placeholder="Company Name"
            value={formData.companyName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
          />
          <input
            type="text"
            name="jobTitle"
            placeholder="Job Title"
            value={formData.jobTitle}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
          />
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
          />
          <input
            type="url"
            name="companyWebsite"
            placeholder="Company Website"
            value={formData.companyWebsite}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading ? "Saving..." : "Finish Setup"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default RecruiterSetup;
