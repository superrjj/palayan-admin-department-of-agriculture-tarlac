import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// Simpleng auth check puwede palitan ng context o Redux
const isLoggedIn = () => !!localStorage.getItem("admin_token");

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/admin_login" replace />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/admin_login" replace />} />
        <Route path="/admin_login" element={<AdminLogin />} />

        {/* Protected routes */}
        <Route
          path="/admin_dashboard/*"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
