import { motion } from "framer-motion";
import heroImg from "../assets/hero.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col md:grid md:grid-cols-2 bg-dark text-white">
      
      {/* Left Section */}
      <div className="hidden md:flex flex-col justify-center px-10 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl lg:text-5xl font-extrabold leading-tight mb-4"
        >
          Unlock Smarter Hiring with <span className="text-primary">JOB SNIFF</span>
        </motion.h1>
        <p className="text-base lg:text-lg text-gray-400 mb-6">
          Upload resumes. Let AI and Elasticsearch do the magic. Filter top candidates in seconds.
        </p>
        <motion.img
          src={heroImg}
          alt="Job Sniff preview"
          className="w-full max-w-sm rounded-xl shadow-lg mt-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>

      {/* Right Section: Always visible */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-lg p-6 sm:p-8 rounded-xl border border-white/10 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
