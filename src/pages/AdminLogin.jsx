// src/components/AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUsers } from "../service/userService";
import { doc, updateDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { User, Lock, Eye, EyeOff, LogOut, ArrowRight, Sun, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";
import { useRole } from "../contexts/RoleContext";
import bcrypt from 'bcryptjs';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { reloadUserData } = useRole();

  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Restricted dialog
  const [showRestricted, setShowRestricted] = useState(false);
  const [restrictedMsg, setRestrictedMsg] = useState('Your account is currently restricted.');

  // Auto logout dialog
  const [showAutoLogout, setShowAutoLogout] = useState(false);
  const [autoLogoutMsg, setAutoLogoutMsg] = useState('');

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState(1);
  const [fpUsername, setFpUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fpError, setFpError] = useState('');

  // Dynamic security questions (from maintenance/accounts_enums)
  const [securityQuestions, setSecurityQuestions] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to security questions list in Firestore
  useEffect(() => {
    const ref = doc(db, "maintenance", "accounts_enums");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      const list = Array.isArray(d.securityQuestions) ? d.securityQuestions : [];
      setSecurityQuestions(
        list.length
          ? list
          : [
              "What is your mother's maiden name?",
              "What is the name of your first pet?",
              "What is your favorite teacher’s name?",
              "What city were you born in?",
              "What was your first school?",
            ]
      );
    });
    return () => unsub();
  }, []);

  // Show auto-logout modal if dashboard set a reason
  useEffect(() => {
    const reason = localStorage.getItem("auto_logout_reason");
    if (reason) {
      let msg = "Your session has ended. Please log in again.";
      if (reason === "other_device") {
        msg = "You have been logged out because your account was accessed from another device.";
      } else if (reason === "inactivity") {
        msg = "Your session has ended due to inactivity. Please log in again.";
      }
      setAutoLogoutMsg(msg);
      setShowAutoLogout(true);
      localStorage.removeItem("auto_logout_reason");
    }
  }, []);

  useEffect(() => {
    if (fpStep === 1 && fpUsername.trim() !== '') setFpError('');
    if (fpStep === 2 && answer.trim() !== '' && selectedQuestion) setFpError('');
    if (fpStep === 3 && newPassword !== '' && confirmPassword !== '') setFpError('');
  }, [fpUsername, answer, newPassword, confirmPassword, selectedQuestion, fpStep]);

  const validateForm = () => {
    const next = {};
    if (!formData.username.trim()) next.username = 'Please enter your username or email';
    if (!formData.password.trim()) next.password = 'Please enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name] || errors.submit) setErrors({});
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const users = await fetchUsers();

      const candidate = users.find(
        u => u.username === formData.username || u.email === formData.username
      );

      let isValid = false;
      if (candidate) {
        const stored = candidate.password || '';
        if (typeof stored === 'string' && stored.startsWith('$2')) {
          try {
            isValid = await bcrypt.compare(formData.password, stored);
          } catch {
            isValid = false;
          }
        } else {
          isValid = stored === formData.password;
        }
      }

      if (candidate && isValid) {
        const status = String(candidate.status || '').toLowerCase();
        const isDeleted = candidate.isDeleted === true;
        const isRestricted = candidate.isRestricted === true || status === 'restricted';

        if (isDeleted || isRestricted) {
          const msg = isDeleted
            ? 'This account has been deleted.'
            : 'Your account is restricted. Please contact an administrator.';
          setRestrictedMsg(msg);
          setShowRestricted(true);
          setIsLoading(false);

          try {
            await addDoc(collection(db, "audit_logs"), {
              userId: candidate.id,
              userName: candidate.fullname || candidate.username || 'Unknown',
              userEmail: candidate.email || '',
              timestamp: new Date(),
              action: 'LOGIN',
              collection: 'accounts',
              documentId: candidate.id,
              documentName: candidate.fullname || candidate.username || 'Unknown',
              description: isDeleted ? 'Login attempt blocked – account deleted' : 'Login attempt blocked – account restricted',
              details: { status: candidate.status || null, isRestricted: candidate.isRestricted === true, isDeleted }
            });
          } catch {}

          return;
        }

        // Allow login for active and inactive. On successful login, set to active.
        const sessionId = uuidv4();
        try {
          await updateDoc(doc(db, "accounts", candidate.id), { 
            lastLogin: new Date(), 
            status: "active",
            currentSession: sessionId
          });
        } catch (err) { console.error("Failed to update lastLogin:", err); }

        localStorage.setItem("admin_token", candidate.id);
        localStorage.setItem("session_id", sessionId);

        await reloadUserData();

        setTimeout(() => {
          navigate("/dashboard");
          setIsLoading(false);
        }, 2000);
      } else {
        setErrors({ submit: "Invalid credentials. Please try again." });
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ submit: "Something went wrong. Please try again later." });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  // Forgot Password Handlers
  const handleFpNextUsername = async () => {
    if (!fpUsername.trim()) return setFpError("Please enter username or email");
    setFpError('');
    try {
      const users = await fetchUsers();
      const user = users.find(u => u.username === fpUsername || u.email === fpUsername);
      if (!user) return setFpError('User not found');
      setSecurityQuestion(user.securityQuestion || '');
      setSelectedQuestion('');
      setFpStep(2);
    } catch {
      setFpError('Something went wrong');
    }
  };

  const handleFpNextAnswer = async () => {
    if (!selectedQuestion) return setFpError("Please select your security question");
    if (!answer.trim()) return setFpError("Please enter your answer");
    if (selectedQuestion !== securityQuestion) {
      return setFpError("Selected question does not match the one on your account");
    }

    setFpError('');
    try {
      const users = await fetchUsers();
      const user = users.find(u => u.username === fpUsername || u.email === fpUsername);
      if (!user) return setFpError('User not found');

      if ((user.securityAnswer || '').toLowerCase() !== answer.toLowerCase()) {
        return setFpError('Wrong answer');
      }

      setFpStep(3);
    } catch {
      setFpError('Something went wrong');
    }
  };

  const handleFpResetPassword = async () => {
    if (!newPassword || !confirmPassword) return setFpError("Please fill both fields");

    const checks = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    if (Object.values(checks).some(v => !v)) return setFpError("Password does not meet all requirements");
    if (newPassword !== confirmPassword) return setFpError("Passwords don't match");

    setFpError('');
    try {
      const users = await fetchUsers();
      const user = users.find(u => u.username === fpUsername || u.email === fpUsername);
      if (!user) return setFpError('User not found');

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(newPassword, salt);

      await updateDoc(doc(db, "accounts", user.id), { password: hashed });
      alert('Password reset successfully!');
      setShowForgotPassword(false);
      setFpStep(1);
      setFpUsername(''); setSecurityQuestion(''); setSelectedQuestion('');
      setAnswer(''); setNewPassword(''); setConfirmPassword(''); setFpError('');
    } catch {
      setFpError('Something went wrong');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0">
        <img src="/rice_field.jpg" alt="Rice Field" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-emerald-900/70"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-ping delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl animate-bounce delay-500"></div>
      </div>

      <div className="absolute top-6 right-6 text-white/80 text-sm backdrop-blur-sm bg-white/10 rounded-xl px-4 py-2 border border-white/20">
        <div className="flex items-center space-x-2">
          <Sun className="w-6 h-6" />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden min-h-[550px]">
            <div className="p-8 text-center border-b border-white/20">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-sm border border-white/30">
                <img src="/ic_palayan_no_bg.png" alt="PalaYan Logo" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-2xl font-extrabold text-white drop-shadow-lg">PalaYan</h1>
              <p className="text-white/70 text-sm mt-1">Department of Agriculture - Tarlac</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className={`w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300/40 transition-all ${errors.username ? "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/30" : ""}`}
                    placeholder="Enter your username or email"
                  />
                </div>
                {errors.username && <p className="mt-1 text-red-300 text-xs">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-12 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300/40 transition-all ${errors.password ? "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/30" : ""}`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-transform hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-red-300 text-xs">{errors.password}</p>}
              </div>

              <div className="text-right">
                <button
                  className="text-green-300 hover:text-green-200 underline text-sm transition-colors"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              {errors.submit && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-center">
                  <p className="text-red-200 text-xs">{errors.submit}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-white/5 border-t border-white/20 text-center">
              <p className="text-white/40 text-xs">© 2025 Department of Agriculture - Tarlac</p>
            </div>
          </div>
        </div>
      </div>

      {showAutoLogout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[22rem] text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <LogOut className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Auto logout</h3>
            <p className="text-sm text-gray-600">{autoLogoutMsg}</p>
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setShowAutoLogout(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestricted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[22rem] text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Login blocked</h3>
            <p className="text-sm text-gray-600">{restrictedMsg}</p>
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setShowRestricted(false)}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-96 shadow-2xl transform transition-all duration-300">
            <h2 className="text-lg font-bold mb-4 text-center">Forgot Password</h2>

            {fpStep === 1 && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter your username or email"
                  value={fpUsername}
                  onChange={(e) => setFpUsername(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:outline-none focus:ring-green-300 transition-all"
                />
                {fpError && <p className="text-red-500 text-sm">{fpError}</p>}
                <button
                  onClick={handleFpNextUsername}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Next
                </button>
              </div>
            )}

            {fpStep === 2 && (
              <div className="space-y-3">
                <label className="block font-medium">Security Question</label>
                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:outline-none focus:ring-green-300 transition-all"
                >
                  <option value="">-- Select your security question --</option>
                  {securityQuestions.map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Your answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:outline-none focus:ring-green-300 transition-all"
                />
                {fpError && <p className="text-red-500 text-sm">{fpError}</p>}
                <button
                  onClick={handleFpNextAnswer}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Submit Answer
                </button>
              </div>
            )}

            {fpStep === 3 && (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:outline-none focus:ring-green-300 transition-all"
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:outline-none focus:ring-green-300 transition-all"
                />

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { rule: "length", label: "At least 8 characters", passed: newPassword.length >= 8 },
                    { rule: "uppercase", label: "One uppercase letter", passed: /[A-Z]/.test(newPassword) },
                    { rule: "number", label: "One number", passed: /[0-9]/.test(newPassword) },
                    { rule: "special", label: "One special character", passed: /[!@#$%^&*(),.?\":{}|<>]/.test(newPassword) },
                  ].map(({ rule, label, passed }) => (
                    <div key={rule} className="flex items-center gap-1">
                      {passed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className={`${passed ? "text-green-600" : "text-gray-500"}`}>{label}</span>
                    </div>
                  ))}
                </div>

                {fpError && <p className="text-red-500 text-sm">{fpError}</p>}

                <button
                  onClick={handleFpResetPassword}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Reset Password
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowForgotPassword(false);
                setFpStep(1);
                setFpUsername(''); setSecurityQuestion(''); setSelectedQuestion('');
                setAnswer(''); setNewPassword(''); setConfirmPassword(''); setFpError('');
              }}
              className="mt-3 w-full py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}