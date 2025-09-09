// debug.js - Add these functions to help debug
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// HTTP function to check collection data
export const debugCollectionData = functions.https.onCall(async (data, context) => {
  try {
    console.log("Debugging collection data...");
    
    // Check diseases collection
    const diseasesSnapshot = await admin.firestore().collection('rice_local_diseases').get();
    const diseases = [];
    
    diseasesSnapshot.forEach(doc => {
      const diseaseData = doc.data();
      diseases.push({
        id: doc.id,
        name: diseaseData.name,
        hasImages: diseaseData.images ? diseaseData.images.length : 0,
        images: diseaseData.images || [],
        createdAt: diseaseData.createdAt
      });
    });
    
    // Check training queue
    const queueSnapshot = await admin.firestore().collection('trainingQueue').get();
    const queueTasks = [];
    
    queueSnapshot.forEach(doc => {
      queueTasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Check storage bucket
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'rice_disease/' });
    const storageFiles = files.map(file => file.name);
    
    return {
      diseases,
      queueTasks,
      storageFiles: storageFiles.slice(0, 20), // First 20 files
      totalStorageFiles: storageFiles.length
    };
    
  } catch (error) {
    console.error("Debug error:", error);
    return { error: error.message };
  }
});

// HTTP function to manually add training task
export const addTrainingTask = functions.https.onCall(async (data, context) => {
  try {
    const task = await admin.firestore().collection("trainingQueue").add({
      diseaseId: "manual_trigger",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      manual: true
    });
    
    return { success: true, taskId: task.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// HTTP function to clear training queue
export const clearTrainingQueue = functions.https.onCall(async (data, context) => {
  try {
    const snapshot = await admin.firestore().collection('trainingQueue').get();
    const batch = admin.firestore().batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return { success: true, deletedCount: snapshot.size };
  } catch (error) {
    return { success: false, error: error.message };
  }
});