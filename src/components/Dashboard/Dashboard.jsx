// components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Wheat, Bug, Shield, Users, Activity } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

const Dashboard = ({ mockData }) => {
  const { overview } = mockData;

  // State for Firestore counts
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [totalVarieties, setTotalVarieties] = useState(0);
  const [totalPests, setTotalPest] = useState(0);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "accounts"));
        const adminsCount = querySnapshot.docs.filter(
          doc => doc.data().role === "admin" || doc.data().role === "super admin"
        ).length;
        setTotalAdmins(adminsCount);
      } catch (error) {
        console.error("Error fetching admins: ", error);
      }
    };

     const fetchDiseases = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "rice_local_diseases"));
        setTotalDiseases(querySnapshot.size); // total docs in collection
      } catch (error) {
        console.error("Error fetching diseases: ", error);
      }
    };

    const fetchVarieties = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "rice_seed_varieties"));
      setTotalVarieties(querySnapshot.size);
    } catch (error) {
      console.error("Error fetching varieties: ", error);
    }
  };

  
  const fetchPest = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "pests"));
      setTotalPest(querySnapshot.size);
    } catch (error) {
      console.error("Error fetching varieties: ", error);
    }
  };

    fetchAdmins();
    fetchDiseases();
    fetchVarieties();
    fetchPest();
  }, []);

  

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center">
            <Wheat className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rice Varieties</p>
              <p className="text-2xl font-bold text-gray-900">{totalVarieties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center">
            <Bug className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pests</p>
              <p className="text-2xl font-bold text-gray-900">{totalPests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Diseases</p>
              <p className="text-2xl font-bold text-gray-900">{totalDiseases}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admin Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalAdmins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activities
        </h2>
        <div className="space-y-4">
          {overview.recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full mr-4 ${
                activity.type === 'pest' ? 'bg-red-100 text-red-600' :
                activity.type === 'disease' ? 'bg-orange-100 text-orange-600' :
                activity.type === 'variety' ? 'bg-green-100 text-green-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {activity.type === 'pest' ? <Bug className="h-4 w-4" /> :
                 activity.type === 'disease' ? <Shield className="h-4 w-4" /> :
                 activity.type === 'variety' ? <Wheat className="h-4 w-4" /> :
                 <Users className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.item}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
