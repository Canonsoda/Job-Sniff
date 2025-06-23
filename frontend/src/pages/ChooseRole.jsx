import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import AuthLayout from "../components/AuthLayout";

const ChooseRole = () => {
  const [selectedRole, setSelectedRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isNewUser = localStorage.getItem("isNewUser") === "true";

    if (!token || !isNewUser) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async () => {
  if (!selectedRole) return;

  try {
    setSubmitting(true);
    const token = localStorage.getItem("token");

    await axios.patch(
      `${API_BASE_URL}/auth/set-role`,
      { role: selectedRole },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    localStorage.removeItem("isNewUser");
    toast.success("Role selected!");

    if (selectedRole === "hr") {
      navigate("/setup-recruiter-profile");
    } else {
      navigate("/dashboard");
    }
  } catch (err) {
    toast.error(err.response?.data?.message || "Something went wrong");
  } finally {
    setSubmitting(false);
  }
};

  return (
    <AuthLayout>
      <div className="text-white text-center space-y-6">
        <h2 className="text-2xl font-bold">Tell us who you are</h2>
        <p className="text-gray-400">Choose one to personalize your experience</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <button
            className={`px-6 py-3 rounded-lg border transition ${
              selectedRole === "hr"
                ? "bg-primary text-white border-primary"
                : "bg-white/5 border-white/20 text-white hover:bg-white/10"
            }`}
            onClick={() => setSelectedRole("hr")}
          >
            👔 I’m an HR
          </button>

          <button
            className={`px-6 py-3 rounded-lg border transition ${
              selectedRole === "applicant"
                ? "bg-primary text-white border-primary"
                : "bg-white/5 border-white/20 text-white hover:bg-white/10"
            }`}
            onClick={() => setSelectedRole("applicant")}
          >
            📄 I’m a Job Applicant
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedRole || submitting}
          className={`mt-6 w-full py-2 rounded-lg font-semibold ${
            selectedRole
              ? "bg-primary hover:bg-primary/90 text-white"
              : "bg-gray-500 text-gray-300 cursor-not-allowed"
          }`}
        >
          {submitting ? "Submitting..." : "Continue"}
        </button>
      </div>
    </AuthLayout>
  );
};

export default ChooseRole;
