import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import {
  Lightbulb,
  FileText,
  CheckCircle,
  Hourglass,
  RefreshCw,
} from "lucide-react";
import UploadSection from "../../components/UploadSection";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const DashboardHome = () => {
  const [stats, setStats] = useState([
    {
      title: "Total Resumes",
      value: 0,
      icon: <FileText className="text-blue-400" size={28} />,
      color: "text-blue-400",
      border: "from-blue-500 to-blue-700",
    },
    {
      title: "Shortlisted",
      value: 0,
      icon: <CheckCircle className="text-green-400" size={28} />,
      color: "text-green-400",
      border: "from-green-500 to-green-700",
    },
    {
      title: "Pending Review",
      value: 0,
      icon: <Hourglass className="text-yellow-400" size={28} />,
      color: "text-yellow-400",
      border: "from-yellow-500 to-yellow-700",
    },
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const { user } = useAuth();
  const isHR = user?.role === "hr";
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/resume/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const { stats: apiStats, uniqueSkills } = res.data;
      
      setStats(prev => prev.map(stat => ({
        ...stat,
        value: apiStats[stat.title.toLowerCase().replace(' ', '')] || 0
      })));
      
      setSuggestions(uniqueSkills);
    } catch (err) {
      toast.error("Failed to fetch dashboard stats");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats();
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-10 relative z-10">
      {/* Welcome Message */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-white tracking-tight"
          >
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-400 mt-1"
          >
            {isHR ? "Here's your overview as a recruiter." : "Your resume status summary."}
          </motion.p>
        </div>
        
        {isHR && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* HR Stats Section */}
      {isHR && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-xl backdrop-blur-md"
              >
                <div className="animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-8 bg-white/10 rounded mb-2"></div>
                  <div className="h-1 bg-white/10 rounded"></div>
                </div>
              </motion.div>
            ))
          ) : (
            stats.map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-xl backdrop-blur-md hover:scale-105 transition-transform relative overflow-hidden"
              >
                <div
                  className={`absolute inset-0 rounded-2xl blur-xl opacity-25 bg-gradient-to-br ${stat.border}`}
                />
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-sm">{stat.title}</span>
                    {stat.icon}
                  </div>
                  <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className={`h-[3px] w-full bg-gradient-to-r ${stat.border} rounded-full`} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Upload Component */}
      <UploadSection onRefresh={fetchDashboardStats} />

      {/* AI Suggestions */}
      {isHR && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="text-yellow-400" size={20} />
            <h3 className="text-white font-semibold text-lg">AI-powered Suggestions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {suggestions.map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 bg-white/10 text-sm text-gray-300 rounded-full hover:bg-white/20 transition"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Applicant View */}
      {!isHR && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
        >
          <p className="text-gray-300">
            Your resume is under review. We'll notify you once a recruiter shortlists it.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardHome;
