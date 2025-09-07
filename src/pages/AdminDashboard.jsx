// pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import Sidebar from '../components/Layout/Sidebar';
import Dashboard from '../components/Dashboard/Dashboard';
import RiceVarietiesManagement from '../components/RiceVarietiesManagement/RiceVarietiesManagement';
import PestManagement from '../components/PestManagement/PestManagement';
import DiseaseManagement from '../components/DiseaseManagement/DiseaseManagement';
import AdminManagement from '../components/AdminManagement/AdminManagement';

// Mock data
import { mockData } from '../data/mockData';

const AdminDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        onNavigate={(path) => {
          navigate(`/admin_dashboard/${path}`);
          setIsSidebarOpen(false);
        }}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<Dashboard mockData={mockData} />} />
            <Route path="varieties" element={<RiceVarietiesManagement mockData={mockData} />} />
            <Route path="pests" element={<PestManagement mockData={mockData} />} />
            <Route path="diseases" element={<DiseaseManagement mockData={mockData} />} />
            <Route path="admins" element={<AdminManagement mockData={mockData} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
