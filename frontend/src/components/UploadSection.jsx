import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const UploadSection = ({ onUploadComplete, onRefresh }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'multiple'
  const { user } = useAuth();
  const isHR = user?.role === "hr";

  const API_URL = import.meta.env.VITE_API_URL;

  const handleSingleFileUpload = async (file) => {
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
      onRefresh?.();
    } catch (err) {
      toast.error("Upload failed!");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleMultipleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    // Validate all files
    for (const file of files) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} is not a PDF file.`);
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    
    for (const file of files) {
      formData.append("resumes", file);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/resume/upload-multiple`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      const { summary } = response.data;
      toast.success(`${summary.successful} out of ${summary.total} resumes uploaded successfully!`);
      
      if (summary.failed > 0) {
        toast.error(`${summary.failed} files failed to upload.`);
      }
      
      onUploadComplete?.();
      onRefresh?.();
    } catch (err) {
      toast.error("Multiple upload failed!");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    
    if (uploadMode === 'single') {
      handleSingleFileUpload(files[0]);
    } else {
      handleMultipleFileUpload(files);
    }
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

      {/* Upload Mode Toggle */}
      {isHR && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setUploadMode('single')}
            className={`px-3 py-1 rounded-full text-sm transition ${
              uploadMode === 'single'
                ? 'bg-teal-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Single File
          </button>
          <button
            onClick={() => setUploadMode('multiple')}
            className={`px-3 py-1 rounded-full text-sm transition ${
              uploadMode === 'multiple'
                ? 'bg-teal-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Multiple Files (Max 10)
          </button>
        </div>
      )}

      <input
        type="file"
        className="hidden"
        id="uploadInput"
        accept="application/pdf"
        multiple={uploadMode === 'multiple'}
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (uploadMode === 'single') {
            handleSingleFileUpload(files[0]);
          } else {
            handleMultipleFileUpload(files);
          }
        }}
        disabled={uploading}
      />
      <label
        htmlFor="uploadInput"
        className={`block mt-4 text-sm transition ${
          uploading ? "text-gray-500 cursor-not-allowed" : "text-teal-400 hover:underline"
        }`}
      >
        {uploading ? "Uploading..." : `Choose ${uploadMode === 'single' ? 'File' : 'Files'}`}
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
