import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUsers } from "../service/userService";
import { User, Lock, Eye, EyeOff, ArrowRight, Sun} from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

 
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Please enter your username or email';
    }
    
    // if (!formData.password) {
    //   newErrors.password = 'Password is required';
    // } else if (formData.password.length < 6) {
    //   newErrors.password = 'Password must be at least 6 characters';
    // }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLogin = async () => {
  if (!validateForm()) return;

  setIsLoading(true);
  setErrors({});

  try {
    const users = await fetchUsers();

    // Check kung match ang username OR email + password
    const user = users.find(
      (u) =>
        (u.username === formData.username || u.email === formData.username) &&
        u.password === formData.password
    );

    if (user) {
      setLoginSuccess(true);

      // Show spinner for 2s before navigating
      setTimeout(() => {
        navigate("/dashboard");
        setIsLoading(false);
      }, 2000);

    } else {
      setErrors({ submit: "Invalid credentials. Please try again." });
      setIsLoading(false);
    }
  } catch (error) {
    console.error("Login error:", error);
    setErrors({ submit: "Something went wrong. Please try again later." });
    setIsLoading(false);
  }
}; 


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };



  return (
        <div className="min-h-screen relative overflow-hidden">
      {/* Rice Field Background */}
        <div className="absolute inset-0">
        <img 
            src="/rice_field.jpg" 
            alt="Rice Field" 
            className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-emerald-900/70"></div>

        {/* Subtle gradient glow accents */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-ping delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl animate-bounce delay-500"></div>
        </div>

      {/* Weather/Time Info */}
      <div className="absolute top-6 right-6 text-white/80 text-sm backdrop-blur-sm bg-white/10 rounded-xl px-4 py-2 border border-white/20">
        <div className="flex items-center space-x-2">
          <Sun className="w-6 h-6" />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
    <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-10 text-center border-b border-white/20">
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-sm border border-white/30">
            <img 
                src="/ic_palayan_no_bg.png" 
                alt="PalaYan Logo" 
                className="w-20 h-20 object-contain"
            />
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">PalaYan</h1>
            <p className="text-white/70 text-sm mt-2">Department of Agriculture - Tarlac</p>
        </div>

        {/* Form Section */}
        <div className="p-8 space-y-6">
            
            {/* Username Field */}
            <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Username or Email</label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`w-full pl-12 pr-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300/40 transition-all ${
                    errors.username ? "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/30" : ""
                }`}
                placeholder="Enter your username or email"
                />
            </div>
            {errors.username && <p className="mt-2 text-red-300 text-sm">{errors.username}</p>}
            </div>

            {/* Password Field */}
            <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70" />
                <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoComplete="new-password" 
                className={`w-full pl-12 pr-12 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300/40 transition-all ${
                    errors.password ? "border-red-400/50 focus:border-red-400/50 focus:ring-red-400/30" : ""
                }`}
                placeholder="Enter your password"
                />
                <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90"
                >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
            {errors.password && <p className="mt-2 text-red-300 text-sm">{errors.password}</p>}
            </div>

            {/* Remember Me + Forgot */}
            <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-white/70">
                <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border border-white/40 bg-transparent focus:ring-green-400"
                />
                <span>Remember me</span>
            </label>
            <button className="text-green-300 hover:text-green-200 underline">Forgot password?</button>
            </div>

            {/* Error Message */}
            {errors.submit && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-center">
                <p className="text-red-200 text-sm">{errors.submit}</p>
            </div>
            )}

            {/* Submit Button */}
            <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full relative bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
            {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Logging in...</span>
                </div>
            ) : (
                <div className="flex items-center justify-center space-x-2">
                <span>Login</span>
                <ArrowRight className="w-5 h-5" />
                </div>
            )}
            </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/20 text-center">
            <p className="text-white/40 text-xs">© 2025 Department of Agriculture - Tarlac</p>
        </div>
        </div>
    </div>
    </div>

    </div>
  );
}