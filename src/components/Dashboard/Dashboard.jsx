import React, { useEffect, useState } from 'react';
import { Wheat, Bug, Shield, Users, Activity } from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const Dashboard = () => {
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [totalVarieties, setTotalVarieties] = useState(0);
  const [totalPests, setTotalPests] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    // Admins: count active, not deleted, role in [SYSTEM_ADMIN, ADMIN]
    const adminsQ = query(
      collection(db, 'accounts'),
      where('isDeleted', '==', false),
      where('status', '==', 'active'),
      where('role', 'in', ['SYSTEM_ADMIN', 'ADMIN'])
    );
    const unsubAdmins = onSnapshot(adminsQ, (snap) => {
      setTotalAdmins(snap.size);
    });

    // Diseases: exclude deleted/archived
    const diseasesQ = query(
      collection(db, 'rice_local_diseases'),
      where('isDeleted', '==', false)
      // If you also have archived flag: where not supported directly; keep a boolean e.g. isArchived:false
    );
    const unsubDiseases = onSnapshot(diseasesQ, (snap) => {
      setTotalDiseases(snap.size);
    });

    // Varieties: exclude deleted/archived
    const varietiesQ = query(
      collection(db, 'rice_seed_varieties'),
      where('isDeleted', '==', false)
      // add where if you have that field
    );
    const unsubVarieties = onSnapshot(varietiesQ, (snap) => {
      setTotalVarieties(snap.size);
    });

    // Pests: exclude deleted/archived
    const pestsQ = query(
      collection(db, 'rice_local_pests'),
      where('isDeleted', '==', false)
    );
    const unsubPests = onSnapshot(pestsQ, (snap) => {
      setTotalPests(snap.size);
    });

    // Recent activities: take from audit_logs, real-time
    const activitiesQ = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      fbLimit(5)
    );
    const unsubActivities = onSnapshot(activitiesQ, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
        // derive type icon by collection
        const type =
          data.collection === 'rice_local_pests'
            ? 'pest'
            : data.collection === 'rice_local_diseases'
            ? 'disease'
            : data.collection === 'rice_seed_varieties'
            ? 'variety'
            : 'admin';
        const display = {
          id: d.id,
          type,
          action: buildActivityLabel(data),
          time: ts.toLocaleString()
        };
        return display;
      });
      setRecentActivities(items);
    });

    return () => {
      unsubAdmins();
      unsubDiseases();
      unsubVarieties();
      unsubPests();
      unsubActivities();
    };
  }, []);

  const buildActivityLabel = (log) => {
    const docName = log.documentName || log.name || 'Unknown';
    const action = (log.action || '').toUpperCase();
    if (action === 'CREATE' || action === 'ADD' || action === 'ADDED' || action === 'INSERT') {
      return `New ${friendlyCollection(log.collection)} added: ${docName}`;
    }
    if (action === 'UPDATE' || action === 'UPDATED' || action === 'EDIT' || action === 'EDITED') {
      return `${friendlyCollection(log.collection)} updated: ${docName}`;
    }
    if (action === 'DELETE' || action === 'DELETED' || action === 'REMOVE' || action === 'REMOVED') {
      return `${friendlyCollection(log.collection)} deleted: ${docName}`;
    }
    return `${friendlyCollection(log.collection)} activity: ${docName}`;
  };

  const friendlyCollection = (col) => {
    switch (col) {
      case 'accounts':
        return 'Account';
      case 'rice_local_pests':
        return 'Pest';
      case 'rice_local_diseases':
        return 'Sisease';
      case 'rice_seed_varieties':
        return 'Rice variety';
      default:
        return 'item';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Overview</h1>

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

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activities
        </h2>
        <div className="space-y-4">
          {recentActivities.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activities yet.</p>
          ) : (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div
                  className={`p-2 rounded-full mr-4 ${
                    activity.type === 'pest'
                      ? 'bg-red-100 text-red-600'
                      : activity.type === 'disease'
                      ? 'bg-orange-100 text-orange-600'
                      : activity.type === 'variety'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {activity.type === 'pest' ? (
                    <Bug className="h-4 w-4" />
                  ) : activity.type === 'disease' ? (
                    <Shield className="h-4 w-4" />
                  ) : activity.type === 'variety' ? (
                    <Wheat className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
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