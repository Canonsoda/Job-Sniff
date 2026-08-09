import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import {
  Lightbulb,
  FileText,
  CheckCircle,
  Hourglass,
  RefreshCw,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import UploadSection from "../../components/UploadSection";
import { confirmAction } from "../../utils/confirmToast";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [analytics, setAnalytics] = useState({
    skillDistribution: [],
    statusDistribution: [],
    cgpaDistribution: []
  });
  const { user } = useAuth();
  const isHR = user?.role === "hr";
  const [isLoading, setIsLoading] = useState(true);
  


  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/resume/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const { stats: apiStats, uniqueSkills, analytics: analyticsData } = res.data;
      
      setStats(prev => prev.map(stat => {
        let key;
        if (stat.title === "Total Resumes") key = "totalResumes";
        else if (stat.title === "Shortlisted") key = "shortlistedResumes";
        else if (stat.title === "Pending Review") key = "pendingReview";
        else key = stat.title.toLowerCase().replace(' ', '');
        
        return {
          ...stat,
          value: apiStats[key] || 0
        };
      }));
      
      setSuggestions(uniqueSkills || []);
      
      // Set analytics data if available
      if (analyticsData) {
        setAnalytics(analyticsData);
      }
    } catch (err) {
      toast.error("Failed to fetch dashboard stats");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats();
  };

  const handleCleanupDuplicates = async () => {
    // Deletes resumes and their stored PDFs permanently, so ask first
    const confirmed = await confirmAction({
      title: "Remove duplicate resumes?",
      message:
        "Among the resumes you uploaded, those sharing an email address are collapsed to the most recent one. The older copies and their PDF files are deleted permanently.",
      confirmLabel: "Remove duplicates",
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/resume/cleanup-duplicates`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(res.data.message);
      fetchDashboardStats(); // Refresh stats after cleanup
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to cleanup duplicates");
    }
  };

  const handleClearAll = async () => {
    // Deliberately no count here. The stat cards show every resume an HR user
    // can see, but the API only deletes the ones they uploaded, so quoting the
    // card would promise a number the request will not deliver. The response
    // reports the real figure.
    const confirmed = await confirmAction({
      title: "Delete all your resumes?",
      message:
        "This permanently deletes every resume you uploaded, along with their PDF files. Resumes uploaded by other accounts are not affected. This action cannot be undone.",
      confirmLabel: "Delete all",
    });

    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/resume/clear-all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(res.data.message);
      fetchDashboardStats(); // Refresh stats after clear
    } catch (err) {
      toast.error("Failed to clear resumes");
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-10 relative z-10">
      {/* Welcome Message */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
          >
            Welcome back, {user?.name?.split(" ")[0]}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {/* A role badge earns its place where a wave emoji did not - the
                role decides what the whole dashboard shows */}
            <span className="rounded-full border border-teal-500/30 bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">
              {isHR ? "Recruiter" : "Applicant"}
            </span>
            <p className="text-sm sm:text-base text-gray-400">
              {isHR ? "Here's your hiring overview." : "Your resume status summary."}
            </p>
          </motion.div>
        </div>

        {isHR && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleCleanupDuplicates}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 rounded-xl transition disabled:opacity-50 border border-red-500/30 hover:border-red-500/50"
            >
              Clean Duplicates
            </button>
            <button
              onClick={handleClearAll}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-xl transition disabled:opacity-50 border border-red-600/30 hover:border-red-600/50"
            >
              Clear All
            </button>
          </div>
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
          {/* Labelled for what it is. These are the most frequent skills across
              the parsed resumes, counted in getDashboardStats - not a model
              output. The AI in this app is the parser, not this panel. */}
          <div className="flex items-center gap-3 mb-1">
            <Lightbulb className="text-yellow-400" size={20} />
            <h3 className="text-white font-semibold text-lg">Most common skills</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Across every resume you can see, ranked by how often each skill appears.
          </p>
          {suggestions.length > 0 ? (
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
          ) : (
            <div className="text-gray-400 text-sm">
              {isLoading ? "Loading suggestions..." : "No skills found. Upload some resumes to see AI suggestions!"}
            </div>
          )}
        </motion.div>
      )}

      {/* Analytics Charts */}
      {isHR && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="text-purple-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Analytics Dashboard</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skill Distribution Chart */}
            {analytics.skillDistribution.length > 0 && (
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white mb-4">Top Skills Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.skillDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="skill" 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.7)"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Status Distribution Chart */}
            {analytics.statusDistribution.length > 0 && (
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white mb-4">Resume Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* CGPA Distribution Chart */}
          {analytics.cgpaDistribution.length > 0 && (
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
              <h3 className="text-lg font-semibold text-white mb-4">CGPA Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.cgpaDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="range" 
                    stroke="rgba(255,255,255,0.7)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.7)"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="count" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {/* Applicant View */}
      {!isHR && (
        <div className="space-y-6">
          {/* Resume Status Card */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
        >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold text-white">Resume Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Status:</span>
                <span className="text-yellow-400 font-medium">Under Review</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Uploaded:</span>
                <span className="text-gray-300">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Last Updated:</span>
                <span className="text-gray-300">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  // Navigate to upload page or trigger upload
                  const uploadInput = document.getElementById('uploadInput');
                  if (uploadInput) uploadInput.click();
                }}
                className="p-4 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 rounded-xl transition-all text-left"
              >
                <div className="text-teal-400 font-medium mb-1">Update Resume</div>
                <div className="text-sm text-gray-400">Upload a new version of your resume</div>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const response = await axios.get(`${import.meta.env.VITE_API_URL}/resume/shortlisted`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    
                    if (response.data.resumes && response.data.resumes.length > 0) {
                      // Download the first resume
                      const resume = response.data.resumes[0];
                      const downloadResponse = await axios.get(`${import.meta.env.VITE_API_URL}/resume/${resume._id}/download`, {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: 'blob'
                      });
                      
                      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', resume.originalFileName || 'resume.pdf');
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      
                      toast.success("Resume downloaded successfully!");
                    } else {
                      toast.error("No resume found to download");
                    }
                  } catch (err) {
                    toast.error("Download failed");
                  }
                }}
                className="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all text-left"
              >
                <div className="text-blue-400 font-medium mb-1">Download Resume</div>
                <div className="text-sm text-gray-400">Get a copy of your uploaded resume</div>
              </button>
            </div>
          </motion.div>

          {/* Tips for Better Chances */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
          >
            <h3 className="text-lg font-semibold text-white mb-4">💡 Tips to Improve Your Chances</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="text-gray-200 font-medium">Keep your resume updated</div>
                  <div className="text-sm text-gray-400">Add new skills and experiences regularly</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="text-gray-200 font-medium">Highlight relevant skills</div>
                  <div className="text-sm text-gray-400">Focus on skills that match job requirements</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="text-gray-200 font-medium">Include quantifiable achievements</div>
                  <div className="text-sm text-gray-400">Use numbers to show your impact</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md"
          >
            <h3 className="text-lg font-semibold text-white mb-4">🔔 Notification Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-200 font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-400">Get notified when your resume is shortlisted</div>
                </div>
                <button className="w-12 h-6 bg-teal-500 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-200 font-medium">Status Updates</div>
                  <div className="text-sm text-gray-400">Receive updates about your application status</div>
                </div>
                <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
                </button>
              </div>
            </div>
        </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
