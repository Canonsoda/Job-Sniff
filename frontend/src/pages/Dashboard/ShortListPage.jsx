import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Trash, Download } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const Shortlisted = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShortlisted = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/resume/shortlisted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes(res.data.resumes || []);
    } catch (err) {
      toast.error("Failed to fetch shortlisted");
    } finally {
      setLoading(false);
    }
  };

  const unshortlist = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${import.meta.env.VITE_API_URL}/resume/${id}/shortlist`, {
        shortlisted: false,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast.success("Removed from shortlist");
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  useEffect(() => {
    fetchShortlisted();
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-center mt-10">Loading shortlisted resumes...</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
        <Star className="text-yellow-400" />
        Shortlisted Resumes
      </h1>

      {resumes.length === 0 ? (
        <p className="text-gray-400 text-center text-lg">No resumes have been shortlisted yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resumes.map((res, i) => (
            <motion.div
              key={res._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{res.extractedData?.name || res.name}</h2>
                <button
                  className="flex items-center gap-1 text-sm text-red-300 hover:text-red-400"
                  onClick={() => unshortlist(res._id)}
                >
                  <Trash size={16} />
                  Remove
                </button>
              </div>

              <p className="text-gray-300 text-sm">📧 {res.extractedData?.email}</p>
              <p className="text-gray-300 text-sm">📱 {res.extractedData?.phone}</p>
              <p className="text-gray-300 text-sm">🎓 CGPA: {res.extractedData?.cgpa}</p>

              <div className="flex flex-wrap gap-2 mt-2">
                {(Array.isArray(res.extractedData?.skills)
                  ? res.extractedData.skills
                  : (res.extractedData?.skills || "").split(",")
                ).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>

              <a
                href={`${import.meta.env.VITE_API_URL}/resume/${res._id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-teal-300 hover:text-teal-400"
              >
                <Download size={16} />
                Download Resume
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shortlisted;
