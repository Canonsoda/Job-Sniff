import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ChooseRole from "./pages/ChooseRole.jsx";
import RecruiterSetup from "./pages/RecruiterSetup.jsx";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess.jsx"; // ✅ Add this

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./Layouts/DashboardLayout.jsx";

import DashboardHome from "./pages/Dashboard/DashboardHome.jsx";
import Searches from "./pages/Dashboard/SearchPage.jsx";
import Settings from "./pages/Dashboard/SettingsPage.jsx";
import Shortlisted from "./pages/Dashboard/ShortListPage.jsx";
import Upload from "./pages/Dashboard/UploadPage.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/choose-role" element={<ChooseRole />} />
      <Route path="/setup-recruiter-profile" element={<RecruiterSetup />} />
      <Route path="/google-auth-success" element={<GoogleAuthSuccess />} /> {/* ✅ FIX */}

      {/* 🔐 Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="upload" element={<Upload />} />
          <Route path="search" element={<Searches />} />
          <Route path="shortlisted" element={<Shortlisted />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
