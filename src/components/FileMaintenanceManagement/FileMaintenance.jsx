import React, { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

const ENUM_DOC_COLL = "maintenance";
const ENUM_DOC_ID = "rice_varieties_enums";

const FileMaintenance = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
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
            setData({
              seasons: d.seasons || [],
              plantingMethods: d.plantingMethods || [],
              environments: d.environments || [],
              yearReleases: d.yearReleases || []
            });
            setLoading(false);
          },
          (e) => {
            console.error("onSnapshot error:", e);
            setToast({ ok: false, msg: e?.message || "Failed to load data." });
            setLoading(false);
          }
        );
        return unsub;
      } catch (e) {
        console.error("Init error:", e);
        setToast({ ok: false, msg: e?.message || "Initialization failed." });
        setLoading(false);
      }
    };

    let unsubFn;
    initAndListen().then((u) => (unsubFn = u));
    return () => unsubFn && unsubFn();
  }, []);

  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 1800);
  };

  const addItem = async (key) => {
  const val = (inputs[key] || "").trim();
  if (!val) return;
  if ((data[key] || []).some((v) => String(v).toLowerCase() === val.toLowerCase())) {
    showToast(false, "Already exists.");
    return;
  }
  try {
    const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);
    await updateDoc(ref, {
      [key]: arrayUnion(val),
      updatedAt: serverTimestamp()
    });
    setInputs((prev) => ({ ...prev, [key]: "" }));
    showToast(true, "Added.");
  } catch (e) {
    console.error("Add failed:", e);
    showToast(false, e?.message || "Add failed.");
  }
};

  const askRemove = (key, value) => {
    setConfirmTarget({ key, value });
    setConfirmOpen(true);
  };

  const doRemove = async () => {
  const { key, value } = confirmTarget || {};
  if (!key) return;
  try {
    const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);
    await updateDoc(ref, {
      [key]: arrayRemove(value),
      updatedAt: serverTimestamp()
    });
    setConfirmOpen(false);
    setConfirmTarget(null);
    showToast(true, "Removed.");
  } catch (e) {
    console.error("Remove failed:", e);
    showToast(false, e?.message || "Remove failed.");
  }
};

  const saveAll = async () => {
    setSaving(true);
    try {
      const ref = doc(db, ENUM_DOC_COLL, ENUM_DOC_ID);
      const sanitize = (arr) =>
        Array.from(new Set((arr || []).map((v) => String(v).trim()).filter(Boolean)));
      await setDoc(
        ref,
        {
          seasons: sanitize(data.seasons),
          plantingMethods: sanitize(data.plantingMethods),
          environments: sanitize(data.environments),
          yearReleases: sanitize(data.yearReleases),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      showToast(true, "Saved.");
    } catch (e) {
      console.error("Save failed:", e);
      showToast(false, e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const section = (title, key, placeholder) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="flex gap-2">
          <input
            value={inputs[key]}
            onChange={(e) => setInputs((p) => ({ ...p, [key]: e.target.value }))}
            placeholder={placeholder}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-0 focus:outline-none focus-visible:outline-none"
          />
          <button
            onClick={() => addItem(key)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
      {data[key]?.length ? (
        <ul className="divide-y divide-gray-200">
          {data[key].map((v) => (
            <li key={v} className="flex items-center justify-between py-2">
              <span className="text-sm">{v}</span>
              <button
                onClick={() => askRemove(key, v)}
                className="text-red-600 hover:text-red-800"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No items yet.</p>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Maintenance</h1>
          <p className="text-gray-600">Manage Rice Variety enumerations from Firestore</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
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
        <div className="text-gray-600 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section("Seasons", "seasons", "e.g., Dry")}
          {section("Planting Methods", "plantingMethods", "e.g., Transplanting")}
          {section("Environments", "environments", "e.g., Rainfed Lowland")}
          {section("Year Releases", "yearReleases", "e.g., 2025")}
        </div>
      )}

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
              Remove “{confirmTarget?.value}” from {confirmTarget?.key}? This will affect forms using these options.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={doRemove} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMaintenance;