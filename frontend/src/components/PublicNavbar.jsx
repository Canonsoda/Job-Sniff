import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PublicNavbar = () => {
  const { user } = useAuth();

  if (user) return null; // Hide navbar when logged in

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-dark text-white shadow-md">
      <Link to="/" className="text-2xl font-bold text-white">
        Resume<span className="text-primary">AI</span>
      </Link>

      <div className="hidden md:flex gap-6 items-center text-gray-300 font-medium">
        <Link to="/features" className="hover:text-primary transition duration-300">Features</Link>

        <Link
          to="/login"
          className="px-4 py-1 rounded bg-primary text-white hover:bg-opacity-80 transition duration-300"
        >
          Login
        </Link>
      </div>

      {/* Mobile Menu Icon */}
      <div className="md:hidden">
        <Menu className="text-gray-300" />
      </div>
    </nav>
  );
};

export default PublicNavbar;
