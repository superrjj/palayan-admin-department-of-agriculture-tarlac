// src/components/FileMaintenance/FileMaintenance.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { useRole } from "../../contexts/RoleContext";

const ENUM_DOC_COLL = "maintenance";
const ENUM_DOC_ID = "rice_varieties_enums";
const ACCOUNTS_ENUM_DOC_ID = "accounts_enums";

const FileMaintenance = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { userInfo } = useRole();
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });

  // Server data (reference)
  const [data, setData] = useState({
    seasons: [],
    plantingMethods: [],
    environments: [],
    yearReleases: []
  });

  // Draft (user edits live here only; not saved until Save Changes)
  const [draft, setDraft] = useState({
    seasons: [],
    plantingMethods: [],
    environments: [],
    yearReleases: []
  });

  const [inputs, setInputs] = useState({
    seasons: "",
    plantingMethods: "",
    environments: "",
    yearReleases: ""
  });

  const [toast, setToast] = useState(null); // {ok,msg}
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // {key,value}
  const [expanded, setExpanded] = useState({
    seasons: false,
    plantingMethods: false,
    environments: false,
    yearReleases: false
  });

  // Active module selector
  const [activeModule, setActiveModule] = useState(null); // 'variety' | 'pest' | 'disease' | 'accounts' | null

  // Accounts enums (security questions)
  const [accLoading, setAccLoading] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState([]); // server
  const [sqDraft, setSqDraft] = useState([]); // draft
  const [sqInput, setSqInput] = useState("");
  const [confirmOpenAcc, setConfirmOpenAcc] = useState(false);
  const [confirmTargetAcc, setConfirmTargetAcc] = useState(null); // {value}

  // Dirty state and navigation guard
  const [isDirty, setIsDirty] = useState(false);
  const [switchGuard, setSwitchGuard] = useState({ open: false, next: null });

  const markDirty = () => setIsDirty(true);

  // Get current user for audit logs
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const adminToken = localStorage.getItem("admin_token");
        const sessionId = localStorage.getItem("session_id");
        if (adminToken && sessionId) {
          const userDoc = await getDoc(doc(db, "accounts", adminToken));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.currentSession === sessionId) {
              setCurrentUser({
                id: userData.id || adminToken,
                fullname: userData.fullname || 'Unknown User',
                username: userData.username || 'unknown',
                email: userData.email || 'unknown@example.com'
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    getCurrentUser();
  }, []);

  // Audit logging function
  const logAuditAction = async (action, collectionName, documentName, description, changes = null) => {
    try {
      console.log('Logging audit action:', { action, collectionName, documentName, currentUser });
      await addDoc(collection(db, "audit_logs"), {
        action,
        collection: collectionName, // Use the passed collectionName here
        documentName,
        description,
        changes,
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date()
      });
      console.log('Audit log created successfully');
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  // Check if an item is being used in the database
  const checkItemUsage = async (itemType, itemValue) => {
    try {
      // Define all collections and their field mappings
      const usageChecks = {
        seasons: [
          { collection: 'rice_seed_varieties', field: 'season' },
          { collection: 'rice_local_pests', field: 'season' },
          { collection: 'rice_local_diseases', field: 'season' }
        ],
        plantingMethods: [
          { collection: 'rice_seed_varieties', field: 'plantingMethod' },
          { collection: 'rice_local_pests', field: 'plantingMethod' },
          { collection: 'rice_local_diseases', field: 'plantingMethod' }
        ],
        environments: [
          { collection: 'rice_seed_varieties', field: 'environment' },
          { collection: 'rice_local_pests', field: 'environment' },
          { collection: 'rice_local_diseases', field: 'environment' }
        ],
        yearReleases: [
          { collection: 'rice_seed_varieties', field: 'yearRelease' },
          { collection: 'rice_local_pests', field: 'yearRelease' },
          { collection: 'rice_local_diseases', field: 'yearRelease' }
        ],
        securityQuestions: [
          { collection: 'accounts', field: 'securityQuestion' }
        ]
      };

      const checks = usageChecks[itemType];
      if (!checks) return false;

      // Check each collection for usage
      for (const check of checks) {
        try {
          const q = collection(db, check.collection);
          const querySnapshot = await getDocs(q);
          
          console.log(`Checking ${check.collection}.${check.field} for "${itemValue}" - found ${querySnapshot.docs.length} documents`);
          
          for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const fieldValue = data[check.field];
            
            // Handle different data types
            if (fieldValue === itemValue) {
              console.log(`Found direct match: ${itemValue} in ${check.collection}.${check.field}`);
              return true; // Direct match
            }
            
            // Handle array fields (like seasons)
            if (Array.isArray(fieldValue) && fieldValue.includes(itemValue)) {
              console.log(`Found array match: ${itemValue} in ${check.collection}.${check.field}`);
              return true; // Value found in array
            }
            
            // Handle string fields that might contain the value
            if (typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(itemValue.toLowerCase())) {
              console.log(`Found string match: ${itemValue} in ${check.collection}.${check.field}`);
              return true; // Value found in string
            }
          }
        } catch (collectionError) {
          console.warn(`Error checking collection ${check.collection}:`, collectionError);
          // Continue to next collection
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking item usage:', error);
      return false; // If error, allow deletion to be safe
    }
  };

  // Toast helper
  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 1800);
  };

  // Load and listen (Variety enums)
  useEffect(() => {
    const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);

    const initAndListen = async () => {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const end = new Date().getFullYear();
          const years = Array.from({ length: end - 2012 + 1 }, (_, i) => String(2012 + i));
          await setDoc(
            ref,
            {
              seasons: ["Dry", "Wet"],
              plantingMethods: ["Direct Seed", "Transplanting"],
              environments: ["Low Irrigated Land", "Rainfed Lowland", "Upperland"],
              yearReleases: years,
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
        }
        const unsub = onSnapshot(
          ref,
          (s) => {
            const d = s.data() || {};
            const nextData = {
              seasons: d.seasons || [],
              plantingMethods: d.plantingMethods || [],
              environments: d.environments || [],
              yearReleases: d.yearReleases || []
            };
            setData(nextData);
            setDraft(nextData); // sync draft with server
            setIsDirty(false);
            setLoading(false);
          },
          (e) => {
            console.error("onSnapshot error:", e);
            showToast(false, e?.message || "Failed to load data.");
            setLoading(false);
          }
        );
        return unsub;
      } catch (e) {
        console.error("Init error:", e);
        showToast(false, e?.message || "Initialization failed.");
        setLoading(false);
        return undefined;
      }
    };

    let unsubFn;
    initAndListen().then((u) => (unsubFn = u));
    return () => { if (unsubFn) unsubFn(); };
  }, []);

  // Load Accounts enums when opening module
  useEffect(() => {
    if (activeModule !== 'accounts') return;
    let unsub;
    const ref = doc(db, ENUM_DOC_COLL, ACCOUNTS_ENUM_DOC_ID);

    const init = async () => {
      try {
        setAccLoading(true);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              securityQuestions: [
                "What is your mother's maiden name?",
                "What is the name of your first pet?",
                "What is your favorite teacher’s name?",
                "What city were you born in?",
                "What was your first school?"
              ],
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
        }
        unsub = onSnapshot(
          ref,
          (s) => {
            const d = s.data() || {};
            const questions = d.securityQuestions || [];
            setSecurityQuestions(questions);
            setSqDraft(questions); // sync draft with server
            setIsDirty(false);
            setAccLoading(false);
          },
          (e) => {
            console.error("accounts onSnapshot error:", e);
            showToast(false, e?.message || "Failed to load security questions.");
            setAccLoading(false);
          }
        );
      } catch (e) {
        console.error("accounts init error:", e);
        showToast(false, e?.message || "Initialization failed.");
        setAccLoading(false);
      }
    };

    init();
    return () => { if (unsub) unsub(); };
  }, [activeModule]);

  // Warn on page close with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Module switching guard
  const requestSwitchModule = (nextId) => {
    if (isDirty) setSwitchGuard({ open: true, next: nextId });
    else setActiveModule(nextId);
  };
  const discardChanges = () => {
    setDraft({
      seasons: data.seasons || [],
      plantingMethods: data.plantingMethods || [],
      environments: data.environments || [],
      yearReleases: data.yearReleases || []
    });
    setSqDraft(securityQuestions || []);
    setIsDirty(false);
    setActiveModule(switchGuard.next);
    setSwitchGuard({ open: false, next: null });
  };
  const cancelSwitch = () => setSwitchGuard({ open: false, next: null });

  // VARIETY: add/remove in draft only
  const addItem = (keyName) => {
    const val = (inputs[keyName] || "").trim();
    if (!val) return;
    if ((draft[keyName] || []).some((v) => String(v).toLowerCase() === val.toLowerCase())) {
      showToast(false, "Already exists.");
      return;
    }
    setDraft((prev) => ({ ...prev, [keyName]: [...(prev[keyName] || []), val] }));
    setInputs((prev) => ({ ...prev, [keyName]: "" }));
    markDirty();
    showToast(true, "Added (not saved).");
    
    // Log audit action
    logAuditAction(
      'ADD',
      'maintenance',
      `${keyName} - ${val}`,
      `Added "${val}" to ${keyName}`
    );
  };

  const askRemove = async (keyName, value) => {
    // Check if the item is being used
    const isUsed = await checkItemUsage(keyName, value);
    
    if (isUsed) {
      const collectionNames = {
        seasons: 'rice varieties, pests, or diseases',
        plantingMethods: 'rice varieties, pests, or diseases',
        environments: 'rice varieties, pests, or diseases',
        yearReleases: 'rice varieties, pests, or diseases',
        securityQuestions: 'user accounts'
      };
      showToast(false, `Cannot delete "${value}" - it's currently being used in ${collectionNames[keyName] || 'the system'}.`);
      return;
    }
    
    setConfirmTarget({ key: keyName, value });
    setConfirmOpen(true);
  };

  const doRemove = () => {
    const { key, value } = confirmTarget || {};
    if (!key) return;
    setDraft((prev) => ({ ...prev, [key]: (prev[key] || []).filter((v) => v !== value) }));
    setConfirmOpen(false);
    setConfirmTarget(null);
    markDirty();
    showToast(true, "Removed (not saved).");
    
    // Log audit action
    logAuditAction(
      'REMOVE',
      'maintenance',
      `${key} - ${value}`,
      `Removed "${value}" from ${key}`
    );
  };

  // VARIETY: Save from draft to Firebase
  const saveAll = async () => {
    setSaving(true);
    try {
      const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);
      const sanitize = (arr) =>
        Array.from(new Set((arr || []).map((v) => String(v).trim()).filter(Boolean)));
      
      const newData = {
        seasons: sanitize(draft.seasons),
        plantingMethods: sanitize(draft.plantingMethods),
        environments: sanitize(draft.environments),
        yearReleases: sanitize(draft.yearReleases),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(ref, newData, { merge: true });
      setIsDirty(false);
      showToast(true, "Saved.");
    } catch (e) {
      console.error("Save failed:", e);
      showToast(false, e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ACCOUNTS: draft add/remove, then save
  const addSecurityQuestion = () => {
    const val = (sqInput || "").trim();
    if (!val) return;
    if ((sqDraft || []).some((v) => String(v).toLowerCase() === val.toLowerCase())) {
      showToast(false, "Already exists.");
      return;
    }
    setSqDraft((prev) => [...prev, val]);
    setSqInput("");
    markDirty();
    showToast(true, "Added (not saved).");
    
    // Log audit action
    logAuditAction(
      'ADD',
      'maintenance',
      `security_questions - ${val}`,
      `Added security question "${val}"`
    );
  };

  const askRemoveSecurityQuestion = async (value) => {
    // Check if the security question is being used
    const isUsed = await checkItemUsage('securityQuestions', value);
    
    if (isUsed) {
      showToast(false, `Cannot delete "${value}" - it's currently being used in user accounts.`);
      return;
    }
    
    setConfirmTargetAcc({ value });
    setConfirmOpenAcc(true);
  };

  const doRemoveSecurityQuestion = () => {
    const value = confirmTargetAcc?.value;
    if (!value) return;
    setSqDraft((prev) => prev.filter((v) => v !== value));
    setConfirmOpenAcc(false);
    setConfirmTargetAcc(null);
    markDirty();
    showToast(true, "Removed (not saved).");
    
    // Log audit action
    logAuditAction(
      'REMOVE',
      'maintenance',
      `security_questions - ${value}`,
      `Removed security question "${value}"`
    );
  };

  const saveAccounts = async () => {
    try {
      const ref = doc(db, ENUM_DOC_COLL, ACCOUNTS_ENUM_DOC_ID);
      const sanitize = (arr) => Array.from(new Set((arr || []).map((v) => String(v).trim()).filter(Boolean)));
      const newData = { securityQuestions: sanitize(sqDraft), updatedAt: serverTimestamp() };
      await setDoc(ref, newData, { merge: true });
      setIsDirty(false);
      showToast(true, "Saved.");
    } catch (e) {
      console.error("Accounts save failed:", e);
      showToast(false, e?.message || "Save failed.");
    }
  };

  // Item row component that checks usage and shows appropriate UI
  const ItemRow = ({ item, keyName, isNewItem, onRemove }) => {
    const [isUsed, setIsUsed] = useState(false);
    const [checkingUsage, setCheckingUsage] = useState(true);

    useEffect(() => {
      const checkUsage = async () => {
        setCheckingUsage(true);
        const used = await checkItemUsage(keyName, item);
        setIsUsed(used);
        setCheckingUsage(false);
      };
      checkUsage();
    }, [keyName, item]);

    return (
      <li className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-md border font-medium ${
            isNewItem 
              ? 'bg-green-100 border-green-300 text-green-800' 
              : 'bg-white border-gray-300 text-gray-700'
          }`}>
            {item}
            {isNewItem && <span className="ml-2 text-xs text-green-600">●</span>}
          </span>
          {checkingUsage ? (
            <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
          ) : isUsed ? (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <Lock className="w-3 h-3" />
              <span>In Use</span>
            </div>
          ) : null}
        </div>
        <button
          onClick={onRemove}
          disabled={isUsed || checkingUsage}
          className={`rounded-lg p-2 transition-colors ${
            isUsed || checkingUsage
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
          }`}
          title={isUsed ? 'Cannot delete - item is in use' : 'Remove'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </li>
    );
  };

  // Security question row component
  const SecurityQuestionRow = ({ question, onRemove }) => {
    const [isUsed, setIsUsed] = useState(false);
    const [checkingUsage, setCheckingUsage] = useState(true);

    useEffect(() => {
      const checkUsage = async () => {
        setCheckingUsage(true);
        const used = await checkItemUsage('securityQuestions', question);
        setIsUsed(used);
        setCheckingUsage(false);
      };
      checkUsage();
    }, [question]);

    return (
      <li className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm px-3 py-1 rounded-md border font-medium bg-white border-gray-300 text-gray-700">
            {question}
          </span>
          {checkingUsage ? (
            <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
          ) : isUsed ? (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <Lock className="w-3 h-3" />
              <span>In Use</span>
            </div>
          ) : null}
        </div>
        <button
          onClick={onRemove}
          disabled={isUsed || checkingUsage}
          className={`rounded-lg p-2 transition-colors ${
            isUsed || checkingUsage
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
          }`}
          title={isUsed ? 'Cannot delete - question is in use' : 'Remove'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </li>
    );
  };

  // Variation card with "view more" using draft
  const section = (title, keyName, placeholder) => {
    const limit = 5;
    const list = draft[keyName] || [];
    const serverList = data[keyName] || [];
    const isExpanded = expanded[keyName];
    const visible = isExpanded ? list : list.slice(0, limit);
    const remaining = Math.max(0, list.length - limit);
    
    // Check if this section has unsaved changes
    const hasUnsavedChanges = JSON.stringify(list.sort()) !== JSON.stringify(serverList.sort());

    return (
      <div className={`relative overflow-hidden bg-white rounded-xl shadow-lg border p-6 transition-all duration-300 hover:shadow-xl ${
        hasUnsavedChanges 
          ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
          : 'border-gray-100 hover:border-emerald-200'
      }`}>
        <div className={`absolute inset-x-0 top-0 h-1.5 transition-colors ${
          hasUnsavedChanges 
            ? 'bg-gradient-to-r from-green-600 via-emerald-500 to-lime-500' 
            : 'bg-gradient-to-r from-emerald-500 via-green-400 to-lime-400 opacity-80'
        }`} />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 text-sm rounded-full border font-medium ${
                hasUnsavedChanges 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {(list || []).length} items
              </span>
              {hasUnsavedChanges && (
                <span className="px-3 py-1 text-sm rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium whitespace-nowrap">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={inputs[keyName]}
              onChange={(e) => setInputs((p) => ({ ...p, [keyName]: e.target.value }))}
              placeholder={placeholder}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-300 transition-colors min-w-48"
            />
            <button
              onClick={() => addItem(keyName)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 active:from-emerald-800 active:to-green-800 shadow-md hover:shadow-lg flex items-center gap-2 text-sm transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {list.length ? (
          <>
            <ul className="space-y-2 min-h-[160px]">
              {visible.map((v) => {
                // Check if this item is newly added (not in server data)
                const isNewItem = !serverList.includes(v);
                return (
                  <ItemRow 
                    key={`${keyName}-${v}`}
                    item={v}
                    keyName={keyName}
                    isNewItem={isNewItem}
                    onRemove={() => askRemove(keyName, v)}
                  />
                );
              })}
            </ul>

            {remaining > 0 && (
              <div className="pt-2">
                <button
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [keyName]: !prev[keyName] }))
                  }
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  {isExpanded ? 'View less' : `View more (${remaining})`}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No items yet.</p>
        )}
      </div>
    );
  };

  // Accounts section (uses sqDraft)
  const accountsSection = (() => {
    // Check if accounts section has unsaved changes
    const hasUnsavedChanges = JSON.stringify(sqDraft.sort()) !== JSON.stringify(securityQuestions.sort());
    
    return (
      <div className={`relative overflow-hidden bg-white rounded-xl shadow-lg border p-6 transition-all duration-300 hover:shadow-xl ${
        hasUnsavedChanges 
          ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50' 
          : 'border-gray-100 hover:border-blue-200'
      }`}>
        <div className={`absolute inset-x-0 top-0 h-1.5 transition-colors ${
          hasUnsavedChanges 
            ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500' 
            : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-400 opacity-80'
        }`} />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-gray-800">🔐 Security Questions</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 text-sm rounded-full border font-medium ${
                hasUnsavedChanges 
                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}>
                {sqDraft.length} questions
              </span>
              {hasUnsavedChanges && (
                <span className="px-3 py-1 text-sm rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium whitespace-nowrap">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={sqInput}
              onChange={(e) => setSqInput(e.target.value)}
              placeholder="e.g., What is your favorite teacher's name?"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 transition-colors min-w-64"
            />
            <button
              onClick={addSecurityQuestion}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 shadow-md hover:shadow-lg flex items-center gap-2 text-sm transition-all duration-200"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {accLoading ? (
          <div className="text-gray-600 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : sqDraft.length ? (
          <ul className="space-y-2 min-h-[160px]">
            {sqDraft.map((q) => (
              <SecurityQuestionRow 
                key={`sq-${q}`}
                question={q}
                onRemove={() => askRemoveSecurityQuestion(q)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No security questions yet.</p>
        )}
      </div>
    );
  })();

  // Top selector grid
  const selectorGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[
        { id: 'variety', label: 'Rice Variety', desc: 'Manage variety enums', icon: '🌾' },
        { id: 'accounts', label: 'Accounts', desc: 'Manage account-related lists', icon: '👤' }
      ].map((m) => (
        <button
          key={m.id}
          onClick={() => requestSwitchModule(m.id)}
          className="relative text-left bg-white rounded-xl shadow-lg p-6 md:p-8 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-emerald-400/40 min-h-32 group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
              {m.icon}
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                {m.label}
              </div>
              <div className="text-sm md:text-base text-gray-600 mt-1 group-hover:text-gray-700 transition-colors">
                {m.desc}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      ))}
    </div>
  );

  // Content per module
  const renderModule = () => {
    if (activeModule === 'variety') {
      return (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => requestSwitchModule(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <span>←</span> Back
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Rice Variety Management</h2>
                <p className="text-gray-600">Manage enumerations for rice varieties</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveAll}
                disabled={saving || loading || !isDirty}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                title={!isDirty ? 'No changes to save' : 'Save Changes'}
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600 flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin" /> 
                <span className="text-lg">Loading variety data...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {section("Seasons", "seasons", "e.g., Dry Season")}
              {section("Planting Methods", "plantingMethods", "e.g., Transplanting")}
              {section("Environments", "environments", "e.g., Rainfed Lowland")}
              {section("Year Releases", "yearReleases", "e.g., 2025")}
            </div>
          )}
        </>
      );
    }

    if (activeModule === 'accounts') {
      return (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => requestSwitchModule(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <span>←</span> Back
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
                <p className="text-gray-600">Manage account-related settings and security questions</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveAccounts}
                disabled={saving || !isDirty}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                title={!isDirty ? 'No changes to save' : 'Save Changes'}
              >
                <Save className="w-5 h-5" /> Save Changes
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              {accountsSection}
            </div>
          </div>
        </>
      );
    }

    // default: selector
    return selectorGrid;
  };

  return (
    <div className="p-6 space-y-6">

      {renderModule()}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white flex items-center gap-2 ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xl w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-red-600">Confirm Remove</h4>
            <p className="text-sm text-gray-700">
              Remove “{confirmTarget?.value}” from {confirmTarget?.key}? This will be removed from the draft. Save Changes to persist.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={doRemove} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 shadow">Remove</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpenAcc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xl w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-red-600">Confirm Remove</h4>
            <p className="text-sm text-gray-700">
              Remove “{confirmTargetAcc?.value}” from Security Questions draft? Save Changes to persist.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpenAcc(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={doRemoveSecurityQuestion} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 shadow">Remove</button>
            </div>
          </div>
        </div>
      )}

      {switchGuard.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xl w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-amber-600">Discard changes?</h4>
            <p className="text-sm text-gray-700">
              You have unsaved changes. If you continue, your edits will be discarded.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={cancelSwitch} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Stay</button>
              <button onClick={discardChanges} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 shadow">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMaintenance;