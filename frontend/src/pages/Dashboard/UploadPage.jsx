import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile?.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }
    setFile(uploadedFile);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file first.");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/resume/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Resume uploaded successfully!");
      setFile(null);
    } catch (err) {
      toast.error("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative z-10 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-2xl font-semibold"
      >
        Upload Resume
      </motion.div>

      <label
        htmlFor="fileInput"
        className="cursor-pointer flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 backdrop-blur-md hover:bg-white/10 transition"
      >
        <UploadCloud size={48} className="text-white mb-4" />
        <p className="text-white font-medium">Click to upload or drag a PDF here</p>
        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {file && (
        <div className="flex items-center gap-3 text-gray-300 bg-white/5 px-4 py-3 rounded-xl border border-white/10 shadow">
          <FileText size={20} />
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isUploading}
        className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default Upload;
