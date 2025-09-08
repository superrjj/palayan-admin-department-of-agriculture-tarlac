import React, { useState, useEffect } from 'react';
import { Wheat, Bug, Shield, Users, Activity } from 'lucide-react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";

const Dashboard = () => {
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [totalVarieties, setTotalVarieties] = useState(0);
  const [totalPests, setTotalPests] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper to add activity to state
  const addActivity = (type, action, item, timestamp) => {
    setRecentActivities(prev => [
      {
        id: Date.now() + Math.random(),
        type,
        action,
        item,
        time: timestamp?.toDate ? timestamp.toDate().toLocaleString() : new Date().toLocaleString()
      },
      ...prev.slice(0, 9)
    ]);
  };

  useEffect(() => {
    let listenersInitialized = 0;
    const totalListeners = 4;

    const checkAllLoaded = () => {
      listenersInitialized++;
      if (listenersInitialized >= totalListeners) {
        setTimeout(() => setIsInitialLoad(false), 1000);
      }
    };

    // 🔹 Admins
    const unsubAdmins = onSnapshot(collection(db, "accounts"), snapshot => {
      const adminsCount = snapshot.docs.filter(
        doc => doc.data().role === "admin" || doc.data().role === "super admin"
      ).length;
      setTotalAdmins(adminsCount);

      if (!isInitialLoad) {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const itemName = data.fullname || "Unknown Admin";
          
          if (change.type === "added") {
            addActivity("admin", `New admin registered: ${itemName}`, itemName, data.createdAt);
          } else if (change.type === "removed") {
            addActivity("admin", `Admin removed: ${itemName}`, itemName, new Date());
          } else if (change.type === "modified") {
            addActivity("admin", `Admin profile updated: ${itemName}`, itemName, data.updatedAt);
          }
        });
      }
      checkAllLoaded();
    });

    // 🔹 Diseases
    const unsubDiseases = onSnapshot(collection(db, "rice_local_diseases"), snapshot => {
      setTotalDiseases(snapshot.size);
      
      if (!isInitialLoad) {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const itemName = data.name || "Unknown Disease";
          
          if (change.type === "added") {
            addActivity("disease", `New disease added: ${itemName}`, itemName, data.createdAt);
          } else if (change.type === "removed") {
            addActivity("disease", `Disease deleted: ${itemName}`, itemName, new Date());
          } else if (change.type === "modified") {
            addActivity("disease", `Disease updated: ${itemName}`, itemName, data.updatedAt);
          }
        });
      }
      checkAllLoaded();
    });

    // 🔹 Varieties
    const unsubVarieties = onSnapshot(collection(db, "rice_seed_varieties"), snapshot => {
      setTotalVarieties(snapshot.size);
      
      if (!isInitialLoad) {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const itemName = data.name || data.varietyName || "Unknown Variety";
          
          if (change.type === "added") {
            addActivity("variety", `New rice variety added: ${itemName}`, itemName, data.createdAt);
          } else if (change.type === "removed") {
            addActivity("variety", `Rice variety deleted: ${itemName}`, itemName, new Date());
          } else if (change.type === "modified") {
            addActivity("variety", `Rice variety updated: ${itemName}`, itemName, data.updatedAt);
          }
        });
      }
      checkAllLoaded();
    });

    // 🔹 Pests
    const unsubPests = onSnapshot(collection(db, "rice_local_pests"), snapshot => {
      setTotalPests(snapshot.size);
      
      if (!isInitialLoad) {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const itemName = data.name || "Unknown Pest";
          
          if (change.type === "added") {
            addActivity("pest", `New pest added: ${itemName}`, itemName, data.createdAt);
          } else if (change.type === "removed") {
            addActivity("pest", `Pest deleted: ${itemName}`, itemName, new Date());
          } else if (change.type === "modified") {
            addActivity("pest", `Pest updated: ${itemName}`, itemName, data.updatedAt);
          }
        });
      }
      checkAllLoaded();
    });

    return () => {
      unsubAdmins();
      unsubDiseases();
      unsubVarieties();
      unsubPests();
    };
  }, [isInitialLoad]);

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
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activities yet.</p>
          ) : (
            recentActivities.map(activity => (
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
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;