import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const UploadSection = ({ onUploadComplete }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const isHR = user?.role === "hr";

  const API_URL = import.meta.env.VITE_API_URL;

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/resume/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      toast.success("Resume uploaded successfully!");
      onUploadComplete?.();
    } catch (err) {
      toast.error("Upload failed!");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileUpload(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`p-6 mb-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md transition-all text-center cursor-pointer ${
        dragOver ? "bg-white/10" : "bg-white/5"
      }`}
    >
      <h2 className="text-xl font-semibold text-white mb-1">
        {isHR ? "Upload Resumes from Sources" : "Upload Your Resume"}
      </h2>
      <p className="text-sm text-gray-400">
        {isHR
          ? "Upload resumes you've received via referrals, job boards, or email."
          : "Upload your resume to be reviewed by recruiters."}
      </p>

      <input
        type="file"
        className="hidden"
        id="uploadInput"
        accept="application/pdf"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        disabled={uploading}
      />
      <label
        htmlFor="uploadInput"
        className={`block mt-4 text-sm transition ${
          uploading ? "text-gray-500 cursor-not-allowed" : "text-teal-400 hover:underline"
        }`}
      >
        {uploading ? "Uploading..." : "Choose File"}
      </label>

      {uploading && (
        <div className="w-full bg-white/10 rounded-full h-2 mt-4">
          <div
            className="bg-teal-400 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default UploadSection;
