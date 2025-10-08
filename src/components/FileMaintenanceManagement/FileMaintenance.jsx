// src/components/FileMaintenance/FileMaintenance.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

const ENUM_DOC_COLL = "maintenance";
const ENUM_DOC_ID = "rice_varieties_enums";
const ACCOUNTS_ENUM_DOC_ID = "accounts_enums";

const FileMaintenance = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  };

  const askRemove = (keyName, value) => {
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
  };

  // VARIETY: Save from draft to Firebase
  const saveAll = async () => {
    setSaving(true);
    try {
      const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);
      const sanitize = (arr) =>
        Array.from(new Set((arr || []).map((v) => String(v).trim()).filter(Boolean)));
      await setDoc(
        ref,
        {
          seasons: sanitize(draft.seasons),
          plantingMethods: sanitize(draft.plantingMethods),
          environments: sanitize(draft.environments),
          yearReleases: sanitize(draft.yearReleases),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
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
  };

  const askRemoveSecurityQuestion = (value) => {
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
  };

  const saveAccounts = async () => {
    try {
      const ref = doc(db, ENUM_DOC_COLL, ACCOUNTS_ENUM_DOC_ID);
      const sanitize = (arr) => Array.from(new Set((arr || []).map((v) => String(v).trim()).filter(Boolean)));
      await setDoc(ref, { securityQuestions: sanitize(sqDraft), updatedAt: serverTimestamp() }, { merge: true });
      setIsDirty(false);
      showToast(true, "Saved.");
    } catch (e) {
      console.error("Accounts save failed:", e);
      showToast(false, e?.message || "Save failed.");
    }
  };

  // Variation card with "view more" using draft
  const section = (title, keyName, placeholder) => {
    const limit = 5;
    const list = draft[keyName] || [];
    const isExpanded = expanded[keyName];
    const visible = isExpanded ? list : list.slice(0, limit);
    const remaining = Math.max(0, list.length - limit);

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <div className="flex gap-2">
            <input
              value={inputs[keyName]}
              onChange={(e) => setInputs((p) => ({ ...p, [keyName]: e.target.value }))}
              placeholder={placeholder}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
            <button
              onClick={() => addItem(keyName)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {list.length ? (
          <>
            <ul className="divide-y divide-gray-200 min-h-[140px]">
              {visible.map((v) => (
                <li key={`${keyName}-${v}`} className="flex items-center justify-between py-2">
                  <span className="text-sm">{v}</span>
                  <button
                    onClick={() => askRemove(keyName, v)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
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
  const accountsSection = (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Security Questions</h3>
        <div className="flex gap-2">
          <input
            value={sqInput}
            onChange={(e) => setSqInput(e.target.value)}
            placeholder="e.g., What is your favorite teacher’s name?"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-0 focus:outline-none focus-visible:outline-none"
          />
          <button
            onClick={addSecurityQuestion}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
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
        <ul className="divide-y divide-gray-200 min-h-[140px]">
          {sqDraft.map((q) => (
            <li key={`sq-${q}`} className="flex items-center justify-between py-2">
              <span className="text-sm">{q}</span>
              <button
                onClick={() => askRemoveSecurityQuestion(q)}
                className="text-red-600 hover:text-red-800"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No security questions yet.</p>
      )}
    </div>
  );

  // Top selector grid
  const selectorGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { id: 'variety', label: 'Rice Variety', desc: 'Manage variety enums' },
        { id: 'pest', label: 'Pest', desc: 'Manage pest-related lists' },
        { id: 'disease', label: 'Rice Disease', desc: 'Manage disease-related lists' },
        { id: 'accounts', label: 'Accounts', desc: 'Manage account-related lists' }
      ].map((m) => (
        <button
          key={m.id}
          onClick={() => requestSwitchModule(m.id)}
          className="text-left bg-white rounded-lg shadow p-5 hover:shadow-md transition border border-transparent hover:border-green-200"
        >
          <div className="text-lg font-semibold">{m.label}</div>
          <div className="text-sm text-gray-600">{m.desc}</div>
        </button>
      ))}
    </div>
  );

  // Content per module
  const renderModule = () => {
    if (activeModule === 'variety') {
      return (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => requestSwitchModule(null)}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-semibold">Rice Variety</h2>
                <p className="text-gray-600 text-sm">Manage enumerations for varieties</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveAll}
                disabled={saving || loading || !isDirty}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
                title={!isDirty ? 'No changes to save' : 'Save Changes'}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-600 flex items-center gap-2 mt-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {section("Seasons", "seasons", "e.g., Dry")}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => requestSwitchModule(null)}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-semibold">Accounts</h2>
                <p className="text-gray-600 text-sm">Manage account-related lists</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveAccounts}
                disabled={saving || !isDirty}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
                title={!isDirty ? 'No changes to save' : 'Save Changes'}
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {accountsSection}
          </div>
        </>
      );
    }

    if (activeModule === 'pest' || activeModule === 'disease') {
      const titles = { pest: "Pest", disease: "Rice Disease" };
      return (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => requestSwitchModule(null)}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-xl font-semibold">{titles[activeModule]}</h2>
                <p className="text-gray-600 text-sm">Configure lists for {titles[activeModule].toLowerCase()}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">
              Placeholder for {titles[activeModule]} maintenance. Wala pang code.
            </p>
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
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow text-white flex items-center gap-2 ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-red-600">Confirm Remove</h4>
            <p className="text-sm text-gray-700">
              Remove “{confirmTarget?.value}” from {confirmTarget?.key}? This will be removed from the draft. Save Changes to persist.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={doRemove} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpenAcc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-red-600">Confirm Remove</h4>
            <p className="text-sm text-gray-700">
              Remove “{confirmTargetAcc?.value}” from Security Questions draft? Save Changes to persist.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpenAcc(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={doRemoveSecurityQuestion} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}

      {switchGuard.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2 text-amber-600">Discard changes?</h4>
            <p className="text-sm text-gray-700">
              You have unsaved changes. If you continue, your edits will be discarded.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={cancelSwitch} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Stay</button>
              <button onClick={discardChanges} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMaintenance;