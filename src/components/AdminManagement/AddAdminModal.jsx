import React, { useState, useEffect } from "react";
import bcrypt from 'bcryptjs';
import { X, CheckCircle, XCircle, Lock, Mail, User, Shield, HelpCircle } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config"; // adjust path if needed

const AddAdminModal = ({ onClose, onSave, adminData = null }) => {
  const [formData, setFormData] = useState({
    fullname: adminData?.fullname || "",
    email: adminData?.email || "",
    username: adminData?.username || "",
    password: adminData?.password || "",
    securityQuestion: adminData?.securityQuestion || "",
    securityAnswer: adminData?.securityAnswer || "",
    role: adminData?.role || "ADMIN",
  });

  const [success, setSuccess] = useState(false);
  const isEdit = !!adminData;

  const [usernameStatus, setUsernameStatus] = useState({ checking: false, ok: false, msg: "" });

  useEffect(() => {
    let cancelled = false;
    const value = (formData.username || "").trim();

    if (!value) {
      setUsernameStatus({ checking: false, ok: false, msg: "" });
      return;
    }
    if (value.length < 8) {
      setUsernameStatus({ checking: false, ok: false, msg: "Username must be at least 8 characters" });
      return;
    }

    setUsernameStatus({ checking: true, ok: false, msg: "" });
    const t = setTimeout(async () => {
      try {
        const q = query(collection(db, "accounts"), where("username", "==", value));
        const snap = await getDocs(q);
        const conflict = snap.docs.find(d => d.id !== (adminData?.id || ""));
        if (!cancelled) {
          if (conflict) {
            setUsernameStatus({ checking: false, ok: false, msg: "Username is already taken" });
          } else {
            setUsernameStatus({ checking: false, ok: true, msg: "Username is available" });
          }
        }
      } catch {
        if (!cancelled) setUsernameStatus({ checking: false, ok: false, msg: "Could not verify username" });
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formData.username, adminData?.id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameStatus.ok || usernameStatus.checking) return;

    let passwordToSave = formData.password;
    try {
      const looksHashed = typeof passwordToSave === 'string' && passwordToSave.startsWith('$2a$');
      const isSameAsOriginal = !!adminData && passwordToSave === adminData?.password;
      if (!looksHashed && !isSameAsOriginal) {
        const salt = await bcrypt.genSalt(10);
        passwordToSave = await bcrypt.hash(formData.password, salt);
      }
    } catch (err) {
      console.error('Password hashing failed:', err);
    }

    onSave(
      {
        ...formData,
        username: formData.username.trim(),
        normalizedUsername: formData.username.trim().toLowerCase(),
        password: passwordToSave
      },
      adminData?.id
    );

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const securityQuestions = [
    "What is your mother's maiden name?",
    "What is the name of your first pet?",
    "What is your favorite teacher’s name?",
    "What city were you born in?",
    "What was your first school?",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            {isEdit ? "Edit Admin" : "Add New Admin"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500">
              <Mail className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500">
              <Shield className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter username"
                required
              />
            </div>
            <div className="mt-1 text-xs">
              {usernameStatus.checking && <span className="text-gray-500">Checking...</span>}
              {!usernameStatus.checking && usernameStatus.msg && (
                <span className={usernameStatus.ok ? 'text-green-600' : 'text-red-600'}>
                  {usernameStatus.msg}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500">
              <Lock className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2 outline-none"
                placeholder="Enter strong password"
                required
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(passwordChecks).map(([rule, passed]) => (
                <div key={rule} className="flex items-center gap-1">
                  {passed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`${passed ? "text-green-600" : "text-gray-500"}`}>
                    {rule === "length" && "At least 8 characters"}
                    {rule === "uppercase" && "One uppercase letter"}
                    {rule === "number" && "One number"}
                    {rule === "special" && "One special character"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Security Question</label>
            <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500">
              <HelpCircle className="w-4 h-4 text-gray-400 mr-2" />
              <select
                name="securityQuestion"
                value={formData.securityQuestion}
                onChange={handleChange}
                className="w-full p-2 outline-none bg-transparent"
              >
                <option value="">-- Select a question --</option>
                {["What is your mother's maiden name?","What is the name of your first pet?","What is your favorite teacher’s name?","What city were you born in?","What was your first school?"].map((q, i) => (
                  <option key={i} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {formData.securityQuestion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
              <input
                type="text"
                name="securityAnswer"
                value={formData.securityAnswer}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter your answer"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isEdit}
            >
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</button>
            <button
              type="submit"
              disabled={!usernameStatus.ok || usernameStatus.checking}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 shadow-md ${(!usernameStatus.ok || usernameStatus.checking) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>

      {success && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">Account {isEdit ? "updated" : "created"} successfully!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAdminModal;