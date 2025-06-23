import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import { motion } from "framer-motion";
import heroImg from "../assets/hero.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Redirect logged-in users directly to dashboard
  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  const handleGetStarted = () => {
    navigate(token ? "/dashboard" : "/login");
  };

  return (
    <div className="bg-dark text-white min-h-screen">
      <PublicNavbar />

      <section className="px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
        <div className="md:w-1/2">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-extrabold leading-tight mb-6"
          >
            Unlock Smarter Hiring with{" "}
            <span className="text-primary">JOB SNIFF</span>
          </motion.h1>

          <p className="text-lg text-gray-300 mb-8">
            Upload resumes. Let AI and Elasticsearch do the magic. Filter top
            candidates in seconds with blazing-fast search.
          </p>

          <button
            onClick={handleGetStarted}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition shadow-lg"
          >
            🚀 Get Started
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="md:w-1/2"
        >
          <img
            src={heroImg}
            alt="Job Sniff dashboard preview"
            className="rounded-xl shadow-xl"
          />
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
