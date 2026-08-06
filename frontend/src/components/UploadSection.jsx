import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const MAX_FILE_MB = 5;
const MAX_FILES = 10;

// Pull the real reason out of the API response instead of showing
// "Upload failed!" for everything - the backend reports rate limits,
// timeouts and parse failures by name.
const errorMessage = (err, fallback) =>
  err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;

const UploadSection = ({ onUploadComplete, onRefresh }) => {
  const [dragOver, setDragOver] = useState(false);
  // 'idle' -> 'uploading' (real %) -> 'analyzing' (indeterminate, LLM is working)
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState("single");
  const { user } = useAuth();
  const isHR = user?.role === "hr";
  const inputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const busy = phase !== "idle";

  // Parsing takes tens of seconds. A ticking counter reads as "working",
  // where a bar stuck at 100% reads as "frozen".
  useEffect(() => {
    if (phase !== "analyzing") return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setElapsed(0);
    setPendingFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  /** Reject non-PDFs and oversized files before spending a round trip on them. */
  const validate = (files) => {
    for (const file of files) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} is not a PDF.`);
        return false;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(
          `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB - the limit is ${MAX_FILE_MB} MB.`
        );
        return false;
      }
    }
    return true;
  };

  const postFiles = async (files, { multiple }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append(multiple ? "resumes" : "resume", file));

    const token = localStorage.getItem("token");
    return axios.post(`${API_URL}/resume/upload${multiple ? "-multiple" : ""}`, formData, {
      headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      onUploadProgress: (e) => {
        const percent = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
        setProgress(percent);
        // Bytes are on the wire in well under a second; everything after this
        // is the AI service parsing, which upload progress cannot measure.
        if (percent >= 100) setPhase("analyzing");
      },
    });
  };

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const multiple = uploadMode === "multiple";
    if (multiple && files.length > MAX_FILES) {
      toast.error(`Select at most ${MAX_FILES} files (you chose ${files.length}).`);
      return;
    }
    if (!validate(files)) return;

    setPendingFiles(files.map((f) => ({ name: f.name, size: f.size })));
    setPhase("uploading");
    setProgress(0);

    try {
      const res = await postFiles(files, { multiple });

      if (multiple) {
        const { summary } = res.data;
        if (summary.successful > 0) {
          toast.success(`Processed ${summary.successful} of ${summary.total} resumes.`);
        }
        (res.data.errors || []).forEach((e) =>
          toast.error(`${e.fileName}: ${e.error}`, { duration: 6000 })
        );
      } else {
        toast.success(`Added ${res.data.extractedData?.name || files[0].name}.`);
      }

      onUploadComplete?.();
      onRefresh?.();
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed."), { duration: 7000 });
    } finally {
      reset();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!busy) handleUpload(e.dataTransfer.files);
  };

  const totalMb = (pendingFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`p-6 mb-6 rounded-2xl border shadow-xl backdrop-blur-md transition-all text-center ${
        dragOver ? "bg-teal-400/10 border-teal-400/50" : "bg-white/5 border-white/10"
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

      {isHR && (
        <div className="flex justify-center gap-2 mt-4">
          {[
            { mode: "single", label: "Single File" },
            { mode: "multiple", label: `Multiple Files (Max ${MAX_FILES})` },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              disabled={busy}
              onClick={() => setUploadMode(mode)}
              className={`px-3 py-1 rounded-full text-sm transition disabled:opacity-50 ${
                uploadMode === mode
                  ? "bg-teal-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        id="uploadInput"
        accept="application/pdf"
        multiple={uploadMode === "multiple"}
        onChange={(e) => handleUpload(e.target.files)}
        disabled={busy}
      />

      {/* The whole zone is the click target, not just the small link below it */}
      <label
        htmlFor="uploadInput"
        className={`mt-4 block rounded-xl border border-dashed px-4 py-8 transition ${
          busy
            ? "border-white/10 cursor-not-allowed"
            : "border-white/25 hover:border-teal-400/60 hover:bg-white/5 cursor-pointer"
        }`}
      >
        {busy ? (
          <span className="text-sm text-gray-400">
            {phase === "uploading" ? "Sending file…" : "Please wait…"}
          </span>
        ) : (
          <>
            <span className="block text-teal-400 text-sm font-medium">
              Choose {uploadMode === "single" ? "a PDF" : "PDFs"}
            </span>
            <span className="block text-xs text-gray-500 mt-1">
              or drag and drop here · PDF only · up to {MAX_FILE_MB} MB each
            </span>
          </>
        )}
      </label>

      {pendingFiles.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 truncate">
          {pendingFiles.length === 1
            ? pendingFiles[0].name
            : `${pendingFiles.length} files`}{" "}
          · {totalMb} MB
        </p>
      )}

      {busy && (
        <div className="mt-4">
          {phase === "uploading" ? (
            <>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-teal-400 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">Uploading… {progress}%</p>
            </>
          ) : (
            <>
              {/* Indeterminate: the server is parsing and cannot report progress */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="h-2 w-1/3 rounded-full bg-teal-400 animate-[pulse_1.2s_ease-in-out_infinite]" />
              </div>
              <p className="mt-2 text-xs text-gray-300">
                Analyzing with AI… {elapsed}s
              </p>
              <p className="text-[11px] text-gray-500">
                {pendingFiles.length > 1
                  ? `Resumes are parsed one at a time — around 10-40s each.`
                  : `This usually takes 10-40 seconds. Keep this tab open.`}
              </p>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default UploadSection;
