// functions/index.js
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processQueue } from "./queueWorker.js";

admin.initializeApp();

// Fixed: Listen to the correct collection name
export const onNewDisease = functions.firestore
  .document("rice_local_diseases/{diseaseId}") // ✅ Correct collection name
  .onCreate(async (snap, context) => {
    console.log(`New disease added: ${context.params.diseaseId}`);
    
    try {
      // Add task sa training queue
      await admin.firestore().collection("trainingQueue").add({
        diseaseId: context.params.diseaseId,
        status: "pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Training task added to queue");
    } catch (error) {
      console.error("Error adding to training queue:", error);
    }
  });

// Also trigger on updates (when images are added)
export const onUpdateDisease = functions.firestore
  .document("rice_local_diseases/{diseaseId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if images were added or changed
    if (JSON.stringify(before.images) !== JSON.stringify(after.images)) {
      console.log(`Disease images updated: ${context.params.diseaseId}`);
      
      try {
        await admin.firestore().collection("trainingQueue").add({
          diseaseId: context.params.diseaseId,
          status: "pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("Training task added to queue due to image update");
      } catch (error) {
        console.error("Error adding to training queue:", error);
      }
    }
  });

// Scheduled function: process training queue every 5 minutes (mas realistic)
export const scheduleTraining = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log("Processing training queue...");
    try {
      await processQueue();
      console.log("Training queue processed successfully");
    } catch (error) {
      console.error("Error processing training queue:", error);
    }
  });

// HTTP function para manual trigger ng training (for testing)
export const triggerTraining = functions.https.onCall(async (data, context) => {
  try {
    await processQueue();
    return { success: true, message: "Training triggered successfully" };
  } catch (error) {
    console.error("Manual training trigger failed:", error);
    return { success: false, error: error.message };
  }
});