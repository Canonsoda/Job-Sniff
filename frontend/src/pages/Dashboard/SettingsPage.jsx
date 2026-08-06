import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../context/AuthContext";

const Settings = () => {
  const { user, setUser } = useAuth();
  const [switchingRole, setSwitchingRole] = useState(false);

  const [formData, setFormData] = useState({
    emailId: "",
    password: "",
    recruiterDetails: {
      companyName: "",
      jobTitle: "",
      phoneNumber: "",
      companyWebsite: "",
    },
  });

  useEffect(() => {
    // Optionally fetch existing data to prefill the form
    setFormData((prev) => ({
      ...prev,
      emailId: user?.emailId || "",
    }));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name in formData.recruiterDetails) {
      setFormData((prev) => ({
        ...prev,
        recruiterDetails: {
          ...prev.recruiterDetails,
          [name]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${import.meta.env.VITE_API_URL}/user/hr/settings`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Settings updated!");
    } catch (err) {
      toast.error("Failed to update settings");
    }
  };

  // Role was previously only selectable during signup, so anyone who ended up
  // with the wrong one had no way to change it.
  const handleRoleSwitch = async (nextRole) => {
    if (nextRole === user?.role) return;

    try {
      setSwitchingRole(true);
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/auth/set-role`,
        { role: nextRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        setUser(jwtDecode(res.data.token));
      }
      toast.success(`Switched to ${nextRole === "hr" ? "HR" : "Applicant"}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not change role");
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <h2 className="text-2xl font-semibold text-white text-center">
        {user.role === "hr" ? "HR Settings" : "Settings"}
      </h2>

      {/* Account type */}
      <div className="rounded-md border border-white/20 bg-white/5 p-4 space-y-3">
        <div>
          <h3 className="text-lg font-medium text-white">Account type</h3>
          <p className="text-sm text-gray-400">
            Currently signed in as{" "}
            <span className="text-teal-400 font-medium">
              {user?.role === "hr" ? "HR / Recruiter" : "Job Applicant"}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {[
            { value: "hr", label: "👔 HR / Recruiter" },
            { value: "applicant", label: "📄 Job Applicant" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={switchingRole || user?.role === value}
              onClick={() => handleRoleSwitch(value)}
              className={`flex-1 px-4 py-2 rounded-md border transition text-sm ${
                user?.role === value
                  ? "bg-teal-600 border-teal-600 text-white cursor-default"
                  : "bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Common Fields */}
        <div>
          <label className="block text-sm text-white mb-1">Email</label>
          <input
            type="email"
            name="emailId"
            value={formData.emailId}
            onChange={handleChange}
            className="w-full p-2 rounded-md bg-white/10 text-white border border-white/20"
          />
        </div>

        <div>
          <label className="block text-sm text-white mb-1">New Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            placeholder="Leave blank to keep unchanged"
            onChange={handleChange}
            className="w-full p-2 rounded-md bg-white/10 text-white border border-white/20"
          />
        </div>

        {/* HR-Only Section */}
        {user.role === "hr" && (
          <>
            <h3 className="text-lg font-medium text-white mt-4">Recruiter Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={formData.recruiterDetails.companyName}
                onChange={handleChange}
                className="p-2 rounded-md bg-white/10 text-white border border-white/20"
              />
              <input
                type="text"
                name="jobTitle"
                placeholder="Job Title"
                value={formData.recruiterDetails.jobTitle}
                onChange={handleChange}
                className="p-2 rounded-md bg-white/10 text-white border border-white/20"
              />
              <input
                type="text"
                name="phoneNumber"
                placeholder="Phone Number"
                value={formData.recruiterDetails.phoneNumber}
                onChange={handleChange}
                className="p-2 rounded-md bg-white/10 text-white border border-white/20"
              />
              <input
                type="text"
                name="companyWebsite"
                placeholder="Company Website"
                value={formData.recruiterDetails.companyWebsite}
                onChange={handleChange}
                className="p-2 rounded-md bg-white/10 text-white border border-white/20"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md"
        >
          Update Settings
        </button>
      </form>
    </div>
  );
};

export default Settings;
