import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CursorBlob from "../components/CursorBlob";
import {
  LogOut,
  Menu,
  UploadCloud,
  Search,
  Star,
  Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const navItems =
    user?.role === "hr"
      ? [
          { path: "/dashboard/upload", label: "Upload", icon: <UploadCloud size={20} /> },
          { path: "/dashboard/search", label: "Search", icon: <Search size={20} /> },
          { path: "/dashboard/shortlisted", label: "Shortlisted", icon: <Star size={20} /> },
          { path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> },
        ]
      : [
          { path: "/dashboard/settings", label: "Settings", icon: <Settings size={20} /> },
        ];

  return (
    <div className="relative flex min-h-screen text-white overflow-hidden font-rubik">
      <CursorBlob />

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } bg-white/5 backdrop-blur-md border-r border-white/10 p-4 transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <div
            className={`flex items-center gap-2 ${
              isSidebarOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            } transition-all duration-300`}
          >
            <h1
              onClick={() => navigate("/dashboard")}
              className="text-xl font-bold cursor-pointer tracking-wide bg-gradient-to-r from-teal-400 via-white to-teal-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer hover:opacity-90 transition"
            >
              JOB SNIFF
            </h1>
          </div>

          <button onClick={toggleSidebar} className="text-white">
            {isSidebarOpen ? (
              <Menu size={22} />
            ) : (
              <span
                onClick={() => navigate("/dashboard")}
                className="text-lg font-bold text-teal-400 cursor-pointer"
              >
                JS
              </span>
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-2">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-md transition-all font-medium ${
                  isActive
                    ? "bg-teal-600/70 text-white shadow-inner"
                    : "hover:bg-white/10 text-gray-200"
                } ${isSidebarOpen ? "text-base" : "text-sm"}`
              }
            >
              <span>{icon}</span>
              {isSidebarOpen && label}
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-2 px-4 py-2 rounded-md text-base bg-red-600 hover:bg-red-700"
        >
          <LogOut size={18} />
          {isSidebarOpen && "Logout"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
