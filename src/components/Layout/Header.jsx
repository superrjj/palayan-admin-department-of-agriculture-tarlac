// src/components/Layout/Header.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Menu, Settings, LogOut, User, ChevronDown, Camera, Mail, Key, Phone, X, Loader2, ZoomIn, ZoomOut, Crop as CropIcon } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getAuth, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const Header = ({ setIsSidebarOpen }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const navigate = useNavigate();

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const fetchUserData = async () => {
      try {
        const start = Date.now();
        let userId = localStorage.getItem('admin_token');
        while (!userId && Date.now() - start < 5000 && !isCancelled) {
          await sleep(500);
          userId = localStorage.getItem('admin_token');
        }

        if (isCancelled) return;

        if (userId) {
          const userDoc = await getDoc(doc(db, 'accounts', userId));
          if (!isCancelled) {
            if (userDoc.exists()) {
              setUserData({ id: userId, ...userDoc.data() });
            } else {
              setUserData(null);
            }
          }
        } else {
          setUserData(null);
        }
      } finally {
        if (!isCancelled) setIsUserLoading(false);
      }
    };

    fetchUserData();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (fullname) => {
    if (!fullname) return '';
    const names = fullname.split(' ').filter(Boolean);
    const initials = names.map((n) => n[0].toUpperCase());
    return initials[0] + (initials.length > 1 ? initials[initials.length - 1] : '');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const userId = localStorage.getItem('admin_token');
      if (userId) {
        await updateDoc(doc(db, 'accounts', userId), {
          currentSession: null,
          lastLogoutAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('session_id');

      setTimeout(() => {
        setIsLoggingOut(false);
        setShowLogoutConfirm(false);
        navigate('/login');
      }, 800);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center h-16 px-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center space-x-4 ml-auto">
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 text-green-700 hover:text-green-900 p-2 rounded-lg hover:bg-green-100"
            >
              {isUserLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-700" />
                  <span className="text-sm font-medium text-gray-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-green-700 rounded-full overflow-hidden flex items-center justify-center">
                    {userData?.photoURL ? (
                      <img src={userData.photoURL} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-medium">
                        {getInitials(userData?.fullname || '') || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{userData.fullname}</p>
                    <p className="text-xs text-gray-500">{userData.role}</p>
                  </div>
                </>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>

            {showProfileMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              >
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowAccountModal(true);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    System Settings
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setShowProfileMenu(false); }}
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 text-center shadow-2xl">
            <h4 className="text-lg font-semibold text-gray-800 mb-5">
              Are you sure you want to logout?
            </h4>

            {isLoggingOut ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">Logging out...</span>
              </div>
            ) : (
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAccountModal && userData && (
        <AccountSettingsModal
          initialData={userData}
          onClose={() => setShowAccountModal(false)}
          onSaved={(next) => setUserData((prev) => ({ ...prev, ...next }))}
        />
      )}
    </header>
  );
};

// Helpers for image handling and compression
const dataURLToImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

// Resize and compress to JPEG Blob
const compressDataUrlToBlob = async (dataUrl, maxSide = 512, quality = 0.85) => {
  const img = await dataURLToImage(dataUrl);
  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, tw, th);

  let q = quality;
  let blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
  while (blob && blob.size > 900 * 1024 && q > 0.4) {
    q -= 0.1;
    blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
  }
  if (!blob) throw new Error('Failed to compress image.');
  return blob;
};

const AccountSettingsModal = ({ initialData, onClose, onSaved }) => {
  const [fullname, setFullname] = useState(initialData.fullname || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [contact, setContact] = useState(initialData.contactNo || '');
  const [photoPreview, setPhotoPreview] = useState(initialData.photoURL || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);

  // Dynamic security questions
  const [securityQuestions, setSecurityQuestions] = useState([]);
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

  const [securityQuestion, setSecurityQuestion] = useState(initialData.securityQuestion || '');
  const [securityAnswer, setSecurityAnswer] = useState(initialData.securityAnswer || '');

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && (showCropper ? setShowCropper(false) : onClose());
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose, showCropper]);

  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onPickPhoto = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setPhotoFile(file);
      setCropSrc(dataUrl);
      setShowCropper(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch {
      setError('Failed to read selected file.');
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const getCroppedDataUrl = async (imageSrc, cropPixels) => {
    const img = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      cropPixels.x,
      cropPixels.y,
      cropPixels.width,
      cropPixels.height,
      0,
      0,
      cropPixels.width,
      cropPixels.height
    );
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const confirmCrop = async () => {
    try {
      if (!cropSrc || !croppedAreaPixels) return;
      const croppedDataUrl = await getCroppedDataUrl(cropSrc, croppedAreaPixels);
      setPhotoPreview(croppedDataUrl);
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      setError('Failed to crop image.');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const userId = localStorage.getItem('admin_token');
      if (!userId) throw new Error('No user id');

      if (securityQuestion && !securityAnswer.trim()) {
        setSaving(false);
        setError('Please provide an answer to your selected security question.');
        return;
      }

      if (email && email !== initialData.email) {
        try {
          const auth = getAuth();
          if (auth.currentUser) {
            await updateEmail(auth.currentUser, email);
          }
        } catch (e) {
          console.warn('updateEmail failed, will still update Firestore:', e);
        }
      }

      const nextFields = {
        fullname: fullname.trim(),
        email: email.trim(),
        contactNo: contact.trim(),
        securityQuestion: securityQuestion || '',
        securityAnswer: securityAnswer || '',
      };

      if (photoPreview && (photoFile || !initialData.photoURL || photoPreview !== initialData.photoURL)) {
        const blob = await compressDataUrlToBlob(photoPreview, 512, 0.85);
        const storage = getStorage();
        const filePath = `avatars/${userId}/avatar_${Date.now()}.jpg`;
        const objectRef = storageRef(storage, filePath);
        await uploadBytes(objectRef, blob);
        const downloadURL = await getDownloadURL(objectRef);
        nextFields.photoURL = downloadURL;
      }

      await updateDoc(doc(db, 'accounts', userId), nextFields);
      onSaved(nextFields);
      onClose();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setError('');
    setSendingReset(true);
    try {
      const auth = getAuth();
      const target = email || auth.currentUser?.email;
      if (!target) throw new Error('No email available.');
      await sendPasswordResetEmail(auth, target);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to send reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <>
      <div
        ref={overlayRef}
        onMouseDown={onOverlayClick}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
      >
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Account Settings</h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
            <section className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Info</h4>

              <div className="flex flex-col items-center justify-center gap-4 mb-5">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-2 ring-gray-200">
                  {photoPreview ? (
                    <img src={photoPreview} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-10 w-10 text-gray-400" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-50">
                    <Camera className="h-4 w-4" />
                    <span>Upload Profile Picture</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        if (photoPreview) {
                          setCropSrc(photoPreview);
                          setShowCropper(true);
                          setZoom(1);
                          setCrop({ x: 0, y: 0 });
                        }
                      }}
                    >
                      
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border pl-9 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full rounded-lg border pl-9 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      placeholder="09XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Security Question</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select a question</label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  >
                    <option value="">-- Select a question --</option>
                    {securityQuestions.map((q, i) => (
                      <option key={i} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your answer</label>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Enter your answer"
                    disabled={!securityQuestion}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This question will be used to verify your identity if you forget your password.
              </p>
            </section>

            <section className="mb-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Change Password / Update Email</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {sendingReset ? 'Sending...' : 'Send password reset email'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                To change password, we will send a reset link to your email.
              </p>
            </section>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-70 inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {showCropper && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Crop Profile Picture</h3>
              <button onClick={() => setShowCropper(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="relative w-full h-[50vh] bg-gray-100 rounded-xl overflow-hidden">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  showGrid={false}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="flex items-center gap-3 mt-4">
                <ZoomOut className="h-4 w-4 text-gray-500" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
                <ZoomIn className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <button
                onClick={() => setShowCropper(false)}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmCrop}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 inline-flex items-center gap-2"
              >
                <CropIcon className="h-4 w-4" />
                Apply crop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;