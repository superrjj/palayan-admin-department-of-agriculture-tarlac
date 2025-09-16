import React, { useEffect, useRef, useState } from 'react';
import { Wheat, Bug, Shield, Users, Activity } from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit
} from 'firebase/firestore';
import { useRole } from '../../contexts/RoleContext';
import { db } from '../../firebase/config';

const Dashboard = () => {
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [totalVarieties, setTotalVarieties] = useState(0);
  const [totalPests, setTotalPests] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const { userInfo } = useRole();

  // keep track of active unsub to swap actor field cleanly
  const activitiesUnsubRef = useRef(null);
  const triedFieldsRef = useRef([]);

  const getActivitiesStorageKey = (uid) => `recentActivities:${uid}`;

  // Preload from session cache ASAP using admin_token
  useEffect(() => {
    const cachedUid = localStorage.getItem('admin_token');
    if (!cachedUid) return;
    try {
      const cached = JSON.parse(sessionStorage.getItem(getActivitiesStorageKey(cachedUid)) || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setRecentActivities(cached);
        setActivitiesLoading(false);
      }
    } catch {}
    // Cleanup the old global key if it exists (avoid cross-user leakage)
    try {
      localStorage.removeItem('recentActivities');
    } catch {}
  }, []);

  useEffect(() => {
    const adminsQ = query(
      collection(db, 'accounts'),
      where('isDeleted', '==', false),
      where('status', '==', 'active'),
      where('role', 'in', ['SYSTEM_ADMIN', 'ADMIN'])
    );
    const unsubAdmins = onSnapshot(adminsQ, (snap) => {
      setTotalAdmins(snap.size);
    });

    const diseasesQ = query(
      collection(db, 'rice_local_diseases'),
      where('isDeleted', '==', false)
    );
    const unsubDiseases = onSnapshot(diseasesQ, (snap) => {
      setTotalDiseases(snap.size);
    });

    const varietiesQ = query(
      collection(db, 'rice_seed_varieties'),
      where('isDeleted', '==', false)
    );
    const unsubVarieties = onSnapshot(varietiesQ, (snap) => {
      setTotalVarieties(snap.size);
    });

    const pestsQ = query(
      collection(db, 'rice_local_pests'),
      where('isDeleted', '==', false)
    );
    const unsubPests = onSnapshot(pestsQ, (snap) => {
      setTotalPests(snap.size);
    });

    return () => {
      unsubAdmins();
      unsubDiseases();
      unsubVarieties();
      unsubPests();
    };
  }, []);

  // Subscribe to recent activities, trying different actor fields if needed
  useEffect(() => {
    const uid = userInfo?.id;
    if (!uid) {
      setActivitiesLoading(true);
      return;
    }

    // Load session-scoped cache for this uid immediately
    try {
      const cached = JSON.parse(sessionStorage.getItem(getActivitiesStorageKey(uid)) || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setRecentActivities(cached);
        setActivitiesLoading(false);
      } else {
        setActivitiesLoading(true);
      }
    } catch {
      setActivitiesLoading(true);
    }

    // reset tried fields and subscribe
    triedFieldsRef.current = [];
    subscribeForActorField(uid, 'userId');

    return () => {
      if (activitiesUnsubRef.current) {
        activitiesUnsubRef.current();
        activitiesUnsubRef.current = null;
      }
    };
  }, [userInfo?.id]);

  const subscribeForActorField = (uid, field) => {
    // avoid retrying same field
    if (triedFieldsRef.current.includes(field)) return;
    triedFieldsRef.current.push(field);

    // cleanup previous listener
    if (activitiesUnsubRef.current) {
      activitiesUnsubRef.current();
      activitiesUnsubRef.current = null;
    }

    const activitiesQ = query(
      collection(db, 'audit_logs'),
      where(field, '==', uid),
      orderBy('timestamp', 'desc'),
      fbLimit(5)
    );

    activitiesUnsubRef.current = onSnapshot(
      activitiesQ,
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
          const type =
            data.collection === 'rice_local_pests'
              ? 'pest'
              : data.collection === 'rice_local_diseases'
              ? 'disease'
              : data.collection === 'rice_seed_varieties'
              ? 'variety'
              : 'admin';
          return {
            id: d.id,
            type,
            action: buildActivityLabel(data),
            time: ts.toLocaleString()
          };
        });

        if (items.length === 0) {
          // try next possible field if any
          if (field === 'userId') subscribeForActorField(uid, 'actorId');
          else if (field === 'actorId') subscribeForActorField(uid, 'performedBy');
          else {
            setRecentActivities([]);
            setActivitiesLoading(false);
            // cache empty so UI is deterministic
            try {
              sessionStorage.setItem(getActivitiesStorageKey(uid), JSON.stringify([]));
            } catch {}
          }
          return;
        }

        setRecentActivities(items);
        try {
          sessionStorage.setItem(getActivitiesStorageKey(uid), JSON.stringify(items));
        } catch {}
        setActivitiesLoading(false);
      },
      (err) => {
        console.error('Recent activities error:', err);
        // on error, attempt the next field too
        if (field === 'userId') subscribeForActorField(uid, 'actorId');
        else if (field === 'actorId') subscribeForActorField(uid, 'performedBy');
        else setActivitiesLoading(false);
      }
    );
  };

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
        return 'Disease';
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
          {activitiesLoading && recentActivities.length === 0 ? (
            <div className="space-y-2">
              <div className="h-12 bg-gray-100 animate-pulse rounded" />
              <div className="h-12 bg-gray-100 animate-pulse rounded" />
            </div>
          ) : recentActivities.length === 0 ? (
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