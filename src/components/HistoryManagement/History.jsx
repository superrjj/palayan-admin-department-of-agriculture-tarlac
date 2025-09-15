import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Edit, Trash2, Plus, Clock, Database, Activity, User } from 'lucide-react';
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

  // FIXED: Complete fetchLogs function with proper query execution
  useEffect(() => {
    const fetchLogs = () => {
      let q;
      
      if (isSystemAdmin()) {
        // System Admin can see all logs
        q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      } else {
        // Regular Admin can only see their own logs
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
          console.log("Audit logs loaded:", data.length);
          console.log("Sample actions:", data.slice(0, 10).map(log => log.action));
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

  // Get unique collections from actual data
  const collections = useMemo(() => {
    const uniqueCollections = [...new Set(auditLogs.map(log => log.collection).filter(Boolean))];
    return uniqueCollections.sort();
  }, [auditLogs]);

  // Get unique actions from actual data
  const actions = useMemo(() => {
    const uniqueActions = [...new Set(auditLogs.map(log => log.action).filter(Boolean))];
    console.log("Unique actions found:", uniqueActions);
    return uniqueActions.sort();
  }, [auditLogs]);

  // Get unique users from actual data
  const users = useMemo(() => {
    const uniqueUsers = [...new Set(auditLogs.map(log => log.userName).filter(Boolean))];
    return uniqueUsers.sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.documentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
      const matchesCollection = selectedCollection === 'ALL' || log.collection === selectedCollection;
      const matchesUser = selectedUser === 'ALL' || log.userName === selectedUser;
      
      let matchesDate = true;
      if (dateRange !== 'ALL') {
        const now = new Date();
        const logDate = new Date(log.timestamp);
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
      
      return matchesSearch && matchesAction && matchesCollection && matchesUser && matchesDate;
    });
  }, [auditLogs, searchTerm, selectedAction, selectedCollection, selectedUser, dateRange]);

  const getActionIcon = (action) => {
    console.log("Getting icon for action:", action);
    
    // Normalize action to uppercase for comparison
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
      default: 
        console.log("Unknown action:", action);
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    // Normalize action to uppercase for comparison
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
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Collection', 'Document', 'Description'],
      ...filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.userName || 'Unknown User',
        log.action,
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

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
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

      {/* History Logs */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            {/* Main Log Row */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Action Badge */}
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                    <span className="font-semibold">{log.action}</span>
                  </div>

                  {/* Main Content - Pantay na positioning */}
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

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

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
    </div>
  );
};

export default History;