import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "../components/Layout/Header";
import Sidebar from "../components/Layout/Sidebar";
import Dashboard from "../components/Dashboard/Dashboard";
import RiceVarietiesManagement from "../components/RiceVarietiesManagement/RiceVarietiesManagement";
import PestManagement from "../components/PestManagement/PestManagement";
import DiseaseManagement from "../components/DiseaseManagement/DiseaseManagement";
import AdminManagement from "../components/AdminManagement/AdminManagement";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const AdminDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // ---------------- Auto-logout logic ----------------
  useEffect(() => {
    const logout = () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("session_id");
      navigate("/admin_login");
    };

    // ---------------- Inactivity logout ----------------
    let inactivityTimer = setTimeout(logout, 10 * 60 * 1000); // 10 mins

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(logout, 10 * 60 * 1000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      clearTimeout(inactivityTimer);
    };
  }, [navigate]);

  // ---------------- Single-session validation ----------------
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("admin_token");
      const sessionId = localStorage.getItem("session_id");
      if (!token || !sessionId) {
        navigate("/admin_login");
        return;
      }

      const userDoc = await getDoc(doc(db, "accounts", token));
      if (!userDoc.exists() || userDoc.data().currentSession !== sessionId) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("session_id");
        navigate("/admin_login");
      }
    };

    const interval = setInterval(checkSession, 5000); // check every 5s
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        onNavigate={(path) => {
          navigate(`/admin_dashboard/${path}`);
          setIsSidebarOpen(false);
        }}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="rice_varieties" element={<RiceVarietiesManagement />} />
            <Route path="rice_pests" element={<PestManagement />} />
            <Route path="rice_diseases" element={<DiseaseManagement />} />
            <Route path="accounts" element={<AdminManagement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
