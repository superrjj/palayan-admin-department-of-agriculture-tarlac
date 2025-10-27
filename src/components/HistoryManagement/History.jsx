import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus, Clock, Database, Activity, User, Lock, Unlock } from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useRole } from '../../contexts/RoleContext';
import { db } from '../../firebase/config';
import HistoryHeader from './HistoryHeader';

const History = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedCollection, setSelectedCollection] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [expandedLog, setExpandedLog] = useState(null);
  const { userInfo, isSystemAdmin } = useRole();
  const [isLoading, setIsLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const hiddenForRegular = useMemo(() => new Set(['LOGIN', 'RESTRICT', 'UNRESTRICT']), []);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const toDateSafe = (timestamp) => {
    if (!timestamp) return null;
    try {
      return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    } catch {
      return null;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = toDateSafe(timestamp);
    if (!date || isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Manila'
    });
  };

  const formatShortRelative = (timestamp, now = Date.now()) => {
    const date = toDateSafe(timestamp);
    if (!date || isNaN(date.getTime())) return 'Invalid';
    const diff = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (diff < 60) return `${diff || 1}s`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  useEffect(() => {
    const fetchLogs = () => {
      let q;
      if (isSystemAdmin()) {
        q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      } else {
        q = query(
          collection(db, "audit_logs"),
          where("userId", "==", userInfo?.id),
          orderBy("timestamp", "desc")
        );
      }
      return onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setAuditLogs(data);
          setIsLoading(false);
        }, 
        (error) => {
          console.error("Error fetching audit logs:", error);
          setIsLoading(false);
        }
      );
    };
    if (userInfo?.id) {
      const unsubscribe = fetchLogs();
      return () => unsubscribe();
    }
  }, [userInfo?.id, isSystemAdmin]);

  const collections = useMemo(() => {
    const uniqueCollections = [...new Set(auditLogs.map(log => log.collection).filter(Boolean))];
    return uniqueCollections.sort();
  }, [auditLogs]);

  const actions = useMemo(() => {
    let uniqueActions = [...new Set(auditLogs.map(log => (log.action || '').toUpperCase()).filter(Boolean))];
    if (!isSystemAdmin()) uniqueActions = uniqueActions.filter(a => !hiddenForRegular.has(a));
    return uniqueActions.sort();
  }, [auditLogs, isSystemAdmin, hiddenForRegular]);

  const users = useMemo(() => {
    const uniqueUsers = [...new Set(auditLogs.map(log => log.userName).filter(Boolean))];
    return uniqueUsers.sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const actionUpper = (log.action || '').toUpperCase();
      if (!isSystemAdmin() && hiddenForRegular.has(actionUpper)) return false;

      const matchesSearch = 
        (log.documentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = selectedAction === 'ALL' || actionUpper === selectedAction;
      const matchesCollection = selectedCollection === 'ALL' || log.collection === selectedCollection;
      const matchesUser = selectedUser === 'ALL' || log.userName === selectedUser;

      let matchesDate = true;
      if (dateRange !== 'ALL') {
        const now = new Date();
        const logDate = toDateSafe(log.timestamp);
        if (!logDate || isNaN(logDate.getTime())) {
          matchesDate = false;
        } else {
          switch (dateRange) {
            case 'TODAY':
              matchesDate = logDate.toDateString() === now.toDateString();
              break;
            case 'WEEK':
              matchesDate = (now - logDate) / (1000 * 60 * 60 * 24) <= 7;
              break;
            case 'MONTH':
              matchesDate = (now - logDate) / (1000 * 60 * 60 * 24) <= 30;
              break;
          }
        }
      }
      return matchesSearch && matchesAction && matchesCollection && matchesUser && matchesDate;
    });
  }, [auditLogs, searchTerm, selectedAction, selectedCollection, selectedUser, dateRange, isSystemAdmin, hiddenForRegular]);

  const getActionIcon = (action) => {
    const normalizedAction = action?.toUpperCase();
    switch (normalizedAction) {
      case 'CREATE':
      case 'ADD':
      case 'ADDED':
      case 'INSERT':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
      case 'UPDATED':
      case 'EDIT':
      case 'EDITED':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
      case 'DELETED':
      case 'REMOVE':
      case 'REMOVED':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'RESTRICT':
      case 'LOGIN':
        return <Lock className="w-4 h-4 text-amber-600" />;
      case 'UNRESTRICT':
        return <Unlock className="w-4 h-4 text-emerald-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    const normalizedAction = action?.toUpperCase();
    switch (normalizedAction) {
      case 'CREATE':
      case 'ADD':
      case 'ADDED':
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
      case 'UPDATED':
      case 'EDIT':
      case 'EDITED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
      case 'DELETED':
      case 'REMOVE':
      case 'REMOVED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RESTRICT':
      case 'LOGIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UNRESTRICT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Collection', 'Document', 'Description'],
      ...filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.userName || 'Unknown User',
        (log.action || '').toUpperCase(),
        log.collection,
        log.documentName || 'Unknown Document',
        log.description
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const resolveTarget = (log) => {
    const collection = (log.collection || '').toString().toLowerCase();
    const id = log.documentId || log.id || log.document_id || null;
    if (!id) return null;
    if (collection.includes('variet')) return { path: '/dashboard/rice_varieties', focusId: id };
    if (collection.includes('pest')) return { path: '/dashboard/rice_pests', focusId: id };
    if (collection.includes('disease')) return { path: '/dashboard/rice_diseases', focusId: id };
    if (collection.includes('account') || collection.includes('accounts')) return { path: '/dashboard/accounts', focusId: id };
    return null;
  };

  const handleLogClick = (log) => {
    const action = (log.action || '').toUpperCase();
    if (action === 'DELETE' || action === 'DELETED' || action === 'REMOVE' || action === 'REMOVED') return;
    const target = resolveTarget(log);
    if (!target) return;
    navigate(target.path, { state: { focusId: target.focusId } });
  };

  return (
    <div className="p-4 lg:p-6">
      <HistoryHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedAction={selectedAction}
        setSelectedAction={setSelectedAction}
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onRefresh={() => window.location.reload()}
        onExport={exportLogs}
        isLoading={isLoading}
        totalLogs={auditLogs.length}
        filteredLogs={filteredLogs.length}
        users={users}
        collections={collections}
        actions={actions}
      />

      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const actionUpper = (log.action || '').toUpperCase();
          const isDelete = ['DELETE','DELETED','REMOVE','REMOVED'].includes(actionUpper);
          const clickable = !isDelete && !!resolveTarget(log);
          return (
          <div
            key={log.id}
            className={`bg-white rounded-lg shadow-sm border transition-shadow ${clickable ? 'hover:shadow-md cursor-pointer' : 'opacity-90'}`}
            onClick={() => clickable ? handleLogClick(log) : undefined}
            role={clickable ? 'button' : 'listitem'}
            aria-disabled={!clickable}
            title={clickable ? 'Go to record' : 'Not navigable'}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                    <span className="font-semibold">{(log.action || '').toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate text-sm">
                        {log.userName || 'Unknown User'}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-600 truncate">
                        {log.documentName || 'Unknown Document'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate ml-0">{log.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span title={formatTimestamp(log.timestamp)}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );})}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No history logs found</h3>
            <p className="text-sm text-gray-500">
              {searchTerm || selectedAction !== 'ALL' || selectedCollection !== 'ALL' || selectedUser !== 'ALL' || dateRange !== 'ALL'
                ? 'Try adjusting your filters to see more results.'
                : 'History logs will appear here as users perform actions.'}
            </p>
          </div>
        )}
      </div>

      {expandedLog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedLog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                Log Details
              </h2>
              <button
                onClick={() => setExpandedLog(null)}
                className="text-gray-400 hover:text-red-500 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Action</div>
                  <div className="text-sm font-medium text-gray-800">{(expandedLog.action || '').toUpperCase() || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Collection</div>
                  <div className="text-sm font-medium text-gray-800">{expandedLog.collection || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Document</div>
                  <div className="text-sm font-medium text-gray-800">
                    {expandedLog.documentName || expandedLog.documentId || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Timestamp</div>
                  <div className="text-sm font-medium text-gray-800">{formatTimestamp(expandedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">User</div>
                  <div className="text-sm font-medium text-gray-800">
                    {expandedLog.userName || 'Unknown'} {expandedLog.userEmail ? `(${expandedLog.userEmail})` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="text-sm font-medium text-gray-800 break-words">
                    {expandedLog.description || '-'}
                  </div>
                </div>
              </div>

              {expandedLog.changes && (
                <div className="mt-5 space-y-4">
                  {'before' in expandedLog.changes && (
                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Before</div>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(expandedLog.changes.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {'after' in expandedLog.changes && (
                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">After</div>
                      <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(expandedLog.changes.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setExpandedLog(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;