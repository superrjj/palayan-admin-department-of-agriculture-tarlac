// queueWorker.js
import admin from "firebase-admin";
import { trainModel } from "./trainModel.js";

export async function processQueue() {
  console.log("Starting queue processing...");
  
  const queueRef = admin.firestore().collection("trainingQueue");
  
  try {
    const snapshot = await queueRef
      .where("status", "==", "pending")
      .orderBy("timestamp")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No pending training tasks found");
      return;
    }

    const task = snapshot.docs[0];
    const taskData = task.data();
    console.log(`Processing training task: ${task.id} for disease: ${taskData.diseaseId}`);

    // Update status to processing
    await task.ref.update({ 
      status: "processing", 
      startedAt: admin.firestore.FieldValue.serverTimestamp() 
    });

    try {
      // Check if we have enough data before training
      const diseasesSnapshot = await admin.firestore().collection('rice_local_diseases').get();
      
      if (diseasesSnapshot.empty) {
        throw new Error("No diseases found in collection");
      }

      let totalImages = 0;
      diseasesSnapshot.forEach(doc => {
        const disease = doc.data();
        if (disease.images && Array.isArray(disease.images)) {
          totalImages += disease.images.length;
        }
      });

      if (totalImages < 10) { // Minimum images needed
        throw new Error(`Not enough training images. Found: ${totalImages}, need at least 10`);
      }

      console.log(`Found ${diseasesSnapshot.size} diseases with ${totalImages} total images`);
      
      // Start training
      await trainModel();
      
      // Mark as completed
      await task.ref.update({ 
        status: "completed", 
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        totalImages: totalImages,
        totalDiseases: diseasesSnapshot.size
      });
      
      console.log("Training completed successfully");
      
    } catch (err) {
      console.error("Training failed:", err);
      await task.ref.update({ 
        status: "failed", 
        error: err.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
  } catch (error) {
    console.error("Error processing queue:", error);
  }
}