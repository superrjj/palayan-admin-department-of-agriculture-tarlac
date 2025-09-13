import React, { useState } from "react";
import { X, UploadCloud, Bug, Globe, Info, AlertCircle, Stethoscope, Heart } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/config";

const AddPestModal = ({ onClose, onSave, pestData = null }) => {
  const [formData, setFormData] = useState({
    name: pestData?.name || "",
    scientificName: pestData?.scientificName || "",
    description: pestData?.description || "",
    cause: pestData?.cause || "",
    symptoms: pestData?.symptoms || "",
    treatments: pestData?.treatments || "",
  });

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isEdit = !!pestData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    console.log(`Field ${name} changed to:`, value);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    console.log("Selected files:", files);

    if (files.length + images.length > 10) {
      alert("You can upload a maximum of 10 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index) => {
    console.log("Removing image at index:", index);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (imageFiles) => {
    console.log("Starting image upload for", imageFiles.length, "files");
    const uploadPromises = imageFiles.map(async (file, index) => {
      const fileName = `${Date.now()}_${index}_${file.name}`;
      const storageRef = ref(storage, `rice_pests/${formData.name}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
            console.log(`Upload progress for ${file.name}: ${progress}%`);
          },
          (error) => {
            console.error(`Upload error for ${file.name}:`, error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(` Upload completed for ${file.name}:`, downloadURL);
              resolve(downloadURL);
            } catch (error) {
              console.error(`Error getting download URL for ${file.name}:`, error);
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
      alert("Pest name is required.");
      return;
    }

    if (!isEdit && images.length === 0) {
      alert("Please upload at least 1 image for new pests.");
      return;
    }

    setUploading(true);

    try {
      let imageUrls = [];
      let mainImageUrl = pestData?.mainImageUrl || "";

      if (images.length > 0) {
        console.log("Uploading", images.length, "images...");
        imageUrls = await uploadImages(images);
        mainImageUrl = imageUrls[0];
        console.log("All images uploaded:", imageUrls);
      }

      const dataToSave = {
        name: formData.name.trim(),
        scientificName: formData.scientificName.trim(),
        description: formData.description.trim(),
        cause: formData.cause.trim(),
        symptoms: formData.symptoms.trim(),
        treatments: formData.treatments.trim(),
        mainImageUrl: mainImageUrl,
        images: imageUrls.length > 0 ? imageUrls : (pestData?.images || []),
      };

      console.log("Calling onSave with data:", dataToSave);

      await onSave(dataToSave, pestData?.id);

      setImages([]);
      setUploadProgress(0);

    } catch (error) {
      console.error("Error in form submission:", error);
      alert(`Error saving pest: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fieldIcons = {
    name: Bug,
    scientificName: Globe,
    description: Info,
    cause: AlertCircle,
    symptoms: Stethoscope,
    treatments: Heart,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            {isEdit ? "Edit Pest" : "Add New Pest"}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-red-500 transition"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {["name", "scientificName", "description", "cause", "symptoms", "treatments"].map((field) => {
            const Icon = fieldIcons[field];
            const label =
              field === "name" ? "Pest Name" :
              field === "scientificName" ? "Scientific Name" :
              field.charAt(0).toUpperCase() + field.slice(1);

            return (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label} {field === 'name' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center border rounded-lg px-3 focus-within:ring-2 focus-within:ring-green-500 transition">
                  {Icon && <Icon className="w-4 h-4 text-gray-400 mr-2" />}
                  {field === 'description' || field === 'cause' || field === 'symptoms' || field === 'treatments' ? (
                    <textarea
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full p-2 outline-none resize-none text-justify"
                      placeholder={`Enter ${label}`}
                      rows={3}
                      disabled={uploading}
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full p-2 outline-none"
                      placeholder={`Enter ${label}`}
                      required={field === 'name'}
                      disabled={uploading}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Show existing images if editing */}
          {isEdit && pestData?.images && pestData.images.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Images</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {pestData.images.slice(0, 6).map((imgUrl, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border">
                    <img 
                      src={imgUrl} 
                      alt={`current-${idx}`} 
                      className="w-full h-20 object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10" fill="%23999">No Image</text></svg>';
                      }}
                    />
                  </div>
                ))}
                {pestData.images.length > 6 && (
                  <div className="flex items-center justify-center rounded-lg border bg-gray-100">
                    <span className="text-xs text-gray-500">+{pestData.images.length - 6} more</span>
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
                Click or drag files here {isEdit ? "(Optional)" : "(Required - Max 10 images)"}
              </span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange}
                disabled={uploading}
              />
            </label>

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
                ></div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3">
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
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 text-white font-medium hover:opacity-90 shadow-md transition disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? "Saving..." : (isEdit ? "Update" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPestModal;
