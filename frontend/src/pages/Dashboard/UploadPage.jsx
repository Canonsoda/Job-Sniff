import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import UploadSection from "../../components/UploadSection";

/**
 * This page used to carry its own copy of the upload logic, which drifted from
 * the one in UploadSection: no file-size check, no two-phase progress, and a
 * generic "Upload failed" that discarded the API's actual reason. Since this is
 * the route the sidebar's "Upload" link points at, users got the worse of the
 * two. It renders the shared component now.
 */
const Upload = () => (
  <div className="relative z-10 space-y-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3"
    >
      <UploadCloud className="text-teal-400" size={24} />
      <h1 className="text-2xl font-semibold text-white">Upload Resume</h1>
    </motion.div>

    <UploadSection />
  </div>
);

export default Upload;
