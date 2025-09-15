import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import { RoleProvider } from './contexts/RoleContext';
import AdminDashboard from "./pages/AdminDashboard";

// Simpleng auth check puwede palitan ng context o Redux
const isLoggedIn = () => !!localStorage.getItem("admin_token");

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <RoleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </RoleProvider>
  );
}
