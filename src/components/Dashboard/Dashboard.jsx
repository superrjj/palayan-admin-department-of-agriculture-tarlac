import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Wheat, Bug, Shield, Users, Activity, BarChart3 } from 'lucide-react';
import { collection, collectionGroup, onSnapshot, query, where, orderBy, limit as fbLimit } from 'firebase/firestore';
import { useRole } from '../../contexts/RoleContext';
import { db } from '../../firebase/config';

const PALETTE = ['#f97316','#22c55e','#3b82f6','#eab308','#ef4444','#8b5cf6'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const Dashboard = () => {
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [totalVarieties, setTotalVarieties] = useState(0);
  const [totalPests, setTotalPests] = useState(0);

  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesResolved, setActivitiesResolved] = useState(false);

  // Line graph series (top 2 diseases, current year)
  const [diseaseSeries, setDiseaseSeries] = useState([]); // [{ name, color, data: number[12], total }]
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const { userInfo } = useRole();

  const activitiesUnsubRef = useRef(null);
  const triedFieldsRef = useRef([]);

  const getActivitiesStorageKey = (uid) => `recentActivities:${uid}`;

  useEffect(() => {
    const cachedUid = localStorage.getItem('admin_token');
    if (!cachedUid) return;
    try {
      const cached = JSON.parse(sessionStorage.getItem(getActivitiesStorageKey(cachedUid)) || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setRecentActivities(cached);
      }
    } catch {}
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
    const unsubAdmins = onSnapshot(adminsQ, (snap) => setTotalAdmins(snap.size));

    const diseasesQ = collection(db, 'rice_local_diseases');
    const unsubDiseases = onSnapshot(diseasesQ, (snap) => {
      const count = snap.docs.reduce((n, d) => n + (d.data().isDeleted !== true ? 1 : 0), 0);
      setTotalDiseases(count);
    });

    const varietiesQ = query(collection(db, 'rice_seed_varieties'), where('isDeleted', '==', false));
    const unsubVarieties = onSnapshot(varietiesQ, (snap) => setTotalVarieties(snap.size));

    const pestsQ = collection(db, 'rice_local_pests');
    const unsubPests = onSnapshot(pestsQ, (snap) => {
      const count = snap.docs.reduce((n, d) => n + (d.data().isDeleted !== true ? 1 : 0), 0);
      setTotalPests(count);
    });

    return () => {
      unsubAdmins();
      unsubDiseases();
      unsubVarieties();
      unsubPests();
    };
  }, []);

  useEffect(() => {
    const uid = userInfo?.id;
    if (!uid) {
      setActivitiesLoading(true);
      setActivitiesResolved(false);
      return;
    }

    try {
      const cached = JSON.parse(sessionStorage.getItem(getActivitiesStorageKey(uid)) || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setRecentActivities(cached);
      }
      setActivitiesLoading(true);
      setActivitiesResolved(false);
    } catch {
      setActivitiesLoading(true);
      setActivitiesResolved(false);
    }

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
    if (triedFieldsRef.current.includes(field)) return;
    triedFieldsRef.current.push(field);

    if (activitiesUnsubRef.current) {
      activitiesUnsubRef.current();
      activitiesUnsubRef.current = null;
    }

    const withOrder = query(
      collection(db, 'audit_logs'),
      where(field, '==', uid),
      orderBy('timestamp', 'desc'),
      fbLimit(5)
    );

    activitiesUnsubRef.current = onSnapshot(
      withOrder,
      (snap) => handleSnapshot(uid, field, snap),
      (err) => {
        if (err?.code === 'failed-precondition') {
          const withoutOrder = query(collection(db, 'audit_logs'), where(field, '==', uid), fbLimit(20));
          activitiesUnsubRef.current = onSnapshot(
            withoutOrder,
            (snap) => handleSnapshot(uid, field, snap, { sortClient: true }),
            (fallbackErr) => {
              console.error('Activities fallback error:', fallbackErr);
              tryNextFieldOrResolveEmpty(uid, field);
            }
          );
          return;
        }
        console.error('Recent activities error:', err);
        tryNextFieldOrResolveEmpty(uid, field);
      }
    );
  };

  const handleSnapshot = (uid, field, snap, opts = {}) => {
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
        time: ts.toLocaleString(),
        _ts: ts.getTime()
      };
    });

    const sorted = opts.sortClient ? items.sort((a, b) => b._ts - a._ts) : items;
    const limited = sorted.slice(0, 4);

    if (limited.length === 0) {
      tryNextFieldOrResolveEmpty(uid, field);
      return;
    }

    setRecentActivities(limited.map(({ _ts, ...rest }) => rest));
    try {
      sessionStorage.setItem(getActivitiesStorageKey(uid), JSON.stringify(limited.map(({ _ts, ...rest }) => rest)));
    } catch {}
    setActivitiesLoading(false);
    setActivitiesResolved(true);
  };

  const tryNextFieldOrResolveEmpty = (uid, field) => {
    if (field === 'userId') {
      subscribeForActorField(uid, 'actorId');
    } else if (field === 'actorId') {
      subscribeForActorField(uid, 'performedBy');
    } else {
      setRecentActivities([]);
      setActivitiesLoading(false);
      setActivitiesResolved(true);
      try {
        sessionStorage.setItem(getActivitiesStorageKey(uid), JSON.stringify([]));
      } catch {}
    }
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

  // Build monthly series for top diseases from users/*/predictions
  useEffect(() => {
    setStatsLoading(true);
    setStatsError(null);

    let unsub = onSnapshot(
      query(collectionGroup(db, 'predictions'), orderBy('timestamp', 'desc'), fbLimit(3000)),
      (snap) => {
        const byDiseaseMonthly = new Map();
        const totals = new Map();
        const currentYear = new Date().getFullYear();
        snap.docs.forEach((doc) => {
          const data = doc.data() || {};
          const name = (data.diseaseName || data.name || 'Unknown').trim() || 'Unknown';
          let date;
          try {
            const ts = data.timestamp;
            date = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date());
          } catch {
            date = new Date();
          }
          if (date.getFullYear() !== currentYear) return;
          const m = Math.min(11, Math.max(0, date.getMonth()));
          if (!byDiseaseMonthly.has(name)) byDiseaseMonthly.set(name, Array(12).fill(0));
          const arr = byDiseaseMonthly.get(name);
          arr[m] += 1;
          totals.set(name, (totals.get(name) || 0) + 1);
        });
        const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
        const series = ranked.map(([name, total], idx) => ({
          name,
          color: PALETTE[idx % PALETTE.length],
          data: byDiseaseMonthly.get(name) || Array(12).fill(0),
          total
        }));
        setDiseaseSeries(series);
        setStatsLoading(false);
      },
      (err) => {
        console.warn('predictions orderBy fallback:', err?.code || err?.message);
        if (unsub) unsub();
        unsub = onSnapshot(
          query(collectionGroup(db, 'predictions_result'), fbLimit(3000)),
          (snap2) => {
            const byDiseaseMonthly = new Map();
            const totals = new Map();
            const currentYear = new Date().getFullYear();
            snap2.docs.forEach((doc) => {
              const data = doc.data() || {};
              const name = (data.diseaseName || data.name || 'Unknown').trim() || 'Unknown';
              let date;
              try {
                const ts = data.timestamp;
                date = ts?.toDate ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : new Date());
              } catch {
                date = new Date();
              }
              if (date.getFullYear() !== currentYear) return;
              const m = Math.min(11, Math.max(0, date.getMonth()));
              if (!byDiseaseMonthly.has(name)) byDiseaseMonthly.set(name, Array(12).fill(0));
              const arr = byDiseaseMonthly.get(name);
              arr[m] += 1;
              totals.set(name, (totals.get(name) || 0) + 1);
            });
            const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
            const series = ranked.map(([name, total], idx) => ({
              name,
              color: PALETTE[idx % PALETTE.length],
              data: byDiseaseMonthly.get(name) || Array(12).fill(0),
              total
            }));
            setDiseaseSeries(series);
            setStatsLoading(false);
          },
          (err2) => {
            console.error('predictions listen error:', err2);
            setDiseaseSeries([]);
            setStatsError('No detection data');
            setStatsLoading(false);
          }
        );
      }
    );

    return () => { if (unsub) unsub(); };
  }, []);

  const chartMaxY = useMemo(() => {
    const vals = diseaseSeries.flatMap(s => s.data);
    const max = Math.max(0, ...vals, 5);
    const step = max <= 10 ? 2 : max <= 25 ? 5 : 10;
    return Math.ceil(max / step) * step;
  }, [diseaseSeries]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activities
            {activitiesLoading && (
              <span className="ml-2 inline-flex items-center">
                <span className="h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </span>
            )}
          </h2>
          <div className="space-y-4">
            {!activitiesResolved ? (
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Most Detected Diseases
          </h2>

          {statsLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
              <div className="h-8 bg-gray-100 animate-pulse rounded" />
            </div>
          ) : diseaseSeries.length === 0 ? (
            <p className="text-gray-500 text-sm">{statsError || 'No detection data.'}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <svg viewBox="0 0 640 260" className="w-full h-[220px]">
                    {(() => {
                      const W = 640, H = 220, padL = 44, padR = 12, padT = 10, padB = 28;
                      const plotW = W - padL - padR;
                      const plotH = H - padT - padB;
                      const xFor = (i) => padL + (i * (plotW / (MONTH_LABELS.length - 1)));
                      const yFor = (v) => padT + (plotH - (v / (chartMaxY || 1)) * plotH);
                      const gridY = 4;
                      const yTicks = Array.from({ length: gridY + 1 }, (_, i) => Math.round((chartMaxY * i) / gridY));
                      const monthX = MONTH_LABELS.map((_, i) => xFor(i));
                      return (
                        <>
                          <rect x="0" y="0" width={W} height={H} fill="white" />
                          {yTicks.map((t, i) => (
                            <g key={`gy-${i}`}>
                              <line x1={padL} y1={yFor(t)} x2={W - padR} y2={yFor(t)} stroke="#e5e7eb" strokeWidth="1" />
                              <text x={padL - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#6b7280">{t}</text>
                            </g>
                          ))}
                          {MONTH_LABELS.map((m, i) => (
                            <text key={`mx-${i}`} x={monthX[i]} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">{m}</text>
                          ))}
                          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#9ca3af" strokeWidth="1" />
                          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#9ca3af" strokeWidth="1" />
                          {diseaseSeries.map((s, si) => {
                            const pts = s.data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
                            return (
                              <g key={`s-${si}`}>
                                <polyline fill="none" stroke={s.color} strokeWidth="2.5" points={pts} />
                                {s.data.map((v, i) => (
                                  <circle key={`p-${si}-${i}`} cx={xFor(i)} cy={yFor(v)} r="3" fill="#fff" stroke={s.color} strokeWidth="2" />
                                ))}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {diseaseSeries.map((s, idx) => (
                  <div key={`lg-${idx}`} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <span className="text-xs text-gray-500">({s.total})</span>
                  </div>
                ))}
              </div>

            
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;