// AddDiseaseModal.jsx
import React, { useState, useEffect } from "react";
import { X, UploadCloud, Book, Globe, Info, AlertCircle, Stethoscope, Heart } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/config";

const normalizeAffectedParts = (v) =>
  Array.isArray(v)
    ? v
    : (typeof v === "string" && v.trim())
      ? v.split(",").map(s => s.trim()).filter(Boolean)
      : [];

const AddDiseaseModal = ({ onClose, onSave, diseaseData = null }) => {
  const [formData, setFormData] = useState({
    name: diseaseData?.name || "",
    localName: diseaseData?.localName || "",
    scientificName: diseaseData?.scientificName || "",
    description: diseaseData?.description || "",
    cause: diseaseData?.cause || "",
    symptoms: diseaseData?.symptoms || "",
    treatments: diseaseData?.treatments || "",
    affectedParts: normalizeAffectedParts(diseaseData?.affectedParts),
  });

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null); // { type: 'error' | 'success', msg: string }
  const isEdit = !!diseaseData;

  useEffect(() => {
    if (!diseaseData) return;
    setFormData(prev => ({
      ...prev,
      name: diseaseData.name || "",
      localName: diseaseData.localName || "",
      scientificName: diseaseData.scientificName || "",
      description: diseaseData.description || "",
      cause: diseaseData.cause || "",
      symptoms: diseaseData.symptoms || "",
      treatments: diseaseData.treatments || "",
      affectedParts: normalizeAffectedParts(diseaseData.affectedParts),
    }));
  }, [diseaseData]);

  const showToast = (msg, type = 'error', ms = 2200) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "affectedParts") {
      setFormData((prev) => {
        const set = new Set(prev.affectedParts || []);
        checked ? set.add(value) : set.delete(value);
        return { ...prev, affectedParts: Array.from(set) };
      });
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 2000) {
      showToast("You can upload a maximum of 2000 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  // Allow selecting an entire folder of images (Chromium/Edge)
  const handleFolderChange = (e) => {
    const allFiles = Array.from(e.target.files || []);
    const imageFiles = allFiles.filter((f) => (f.type || '').startsWith('image/'));
    if (imageFiles.length + images.length > 2000) {
      showToast("You can upload a maximum of 2000 images.");
      return;
    }
    setImages((prev) => [...prev, ...imageFiles]);
  };

  const handleClearAllImages = () => setImages([]);

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (imageFiles) => {
    const uploadPromises = imageFiles.map(async (file, index) => {
      const fileName = `${Date.now()}_${index}_${file.name}`;
      const storageRef = ref(storage, `rice_disease/${formData.name}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Disease name is required.");
      return;
    }

    if (!isEdit && images.length === 0) {
      showToast("Please upload at least 1 image for new diseases.");
      return;
    }

    // Check for duplicate name across all collections
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("../../firebase/config");
      
      const nameToCheck = formData.name.trim();
      
      // Check in rice_seed_varieties
      const varietiesQuery = query(
        collection(db, "rice_seed_varieties"),
        where("varietyName", "==", nameToCheck)
      );
      const varietiesSnapshot = await getDocs(varietiesQuery);
      
      // Check in rice_local_pests
      const pestsQuery = query(
        collection(db, "rice_local_pests"),
        where("name", "==", nameToCheck)
      );
      const pestsSnapshot = await getDocs(pestsQuery);
      
      // Check in rice_local_diseases
      const diseasesQuery = query(
        collection(db, "rice_local_diseases"),
        where("name", "==", nameToCheck)
      );
      const diseasesSnapshot = await getDocs(diseasesQuery);
      
      // If editing, exclude current disease from duplicate check
      const isDuplicate = 
        varietiesSnapshot.docs.length > 0 ||
        pestsSnapshot.docs.length > 0 ||
        diseasesSnapshot.docs.some(doc => isEdit ? doc.id !== diseaseData?.id : true);
      
      if (isDuplicate) {
        showToast(`The name "${nameToCheck}" is already used by a variety, pest, or disease. Please choose a different name.`);
        return;
      }
    } catch (error) {
      console.error("Error checking for duplicate name:", error);
      // Continue with submission if check fails
    }

    setUploading(true);
    try {
      let imageUrls = [];
      let mainImageUrl = diseaseData?.mainImageUrl || "";

      if (images.length > 0) {
        imageUrls = await uploadImages(images);
        mainImageUrl = imageUrls[0] || mainImageUrl;
      }

      const dataToSave = {
        name: formData.name.trim(),
        localName: formData.localName.trim(),
        scientificName: formData.scientificName.trim(),
        description: formData.description.trim(),
        cause: formData.cause.trim(),
        symptoms: formData.symptoms.trim(),
        treatments: formData.treatments.trim(),
        affectedParts: Array.isArray(formData.affectedParts) ? formData.affectedParts : normalizeAffectedParts(formData.affectedParts),
        mainImageUrl,
        images: imageUrls.length > 0 ? imageUrls : (diseaseData?.images || []),
      };

      await onSave(dataToSave, diseaseData?.id);

      setImages([]);
      setUploadProgress(0);
    } catch (error) {
      showToast(`Error saving disease: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fieldIcons = {
    name: Book,
    localName: Book,
    scientificName: Globe,
    description: Info,
    cause: AlertCircle,
    symptoms: Stethoscope,
    treatments: Heart,
  };

  const affectedPartOptions = ["Dahon", "Tangkay", "Bunga", "Ugat"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-[28rem] relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            {isEdit ? "Edit Disease" : "Add New Disease"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={handleSubmit} className="space-y-3" id="disease-form">
            {["name", "localName", "scientificName", "description", "cause", "symptoms", "treatments"].map((field) => {
              const Icon = fieldIcons[field];
              const label =
                field === "name" ? "Disease Name" :
                field === "localName" ? "Local Name" :
                field === "scientificName" ? "Scientific Name" :
                field.charAt(0).toUpperCase() + field.slice(1);

              const isTextArea = ['description', 'cause', 'symptoms', 'treatments'].includes(field);

              return (
                <div key={field} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500 transition">
                    {Icon && <Icon className="w-4 h-4 text-gray-400 mr-2" />}
                    {isTextArea ? (
                      <textarea
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full p-2 outline-none resize-none text-justify"
                        placeholder={`Enter ${label}`}
                        rows={3}
                        disabled={uploading}
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full p-2 outline-none"
                        placeholder={`Enter ${label}`}
                        required
                        disabled={uploading}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Affected Parts */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Affected Part(s) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {affectedPartOptions.map((part) => (
                  <label key={part} className="inline-flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 transition">
                    <input
                      type="checkbox"
                      name="affectedParts"
                      value={part}
                      checked={Array.isArray(formData.affectedParts) && formData.affectedParts.includes(part)}
                      onChange={handleChange}
                      disabled={uploading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{part}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Show existing images if editing */}
            {isEdit && diseaseData?.images && diseaseData.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Images</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {diseaseData.images.slice(0, 6).map((imgUrl, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border">
                      <img
                        src={imgUrl}
                        alt={`current-${idx}`}
                        className="w-full h-20 object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                  {diseaseData.images.length > 6 && (
                    <div className="flex items-center justify-center rounded-lg border bg-gray-100">
                      <span className="text-xs text-gray-500">+{diseaseData.images.length - 6} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isEdit ? "Upload New Images (Optional)" : "Upload Images"}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-5 cursor-pointer hover:border-green-500 transition">
                <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-gray-500 text-sm text-center">
                  Click or drag files here {isEdit ? "(Optional)" : "(Required - Max 2000 images)"}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploading}
                  required={!isEdit}
                />
              </label>

              {/* Folder picker (Chromium/Edge support) */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <label className="px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    directory=""
                    webkitdirectory=""
                    multiple
                    accept="image/*"
                    onChange={handleFolderChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  Select Folder of Images
                </label>
                {images.length > 0 && (
                  <>
                    <span className="text-sm text-gray-600">{images.length} image(s) selected</span>
                    <button
                      type="button"
                      onClick={handleClearAllImages}
                      className="text-sm text-red-600 hover:underline"
                      disabled={uploading}
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`preview-${idx}`}
                        className="w-full h-20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={uploading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="disease-form"
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 shadow-md transition disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? "Saving..." : (isEdit ? "Update" : "Save")}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60]">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{toast.msg}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDiseaseModal;