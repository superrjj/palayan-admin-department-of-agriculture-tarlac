// trainModel.js
import * as admin from 'firebase-admin';
import * as tf from '@tensorflow/tfjs';

export async function getImagesAndLabels() {
  console.log("Loading images and labels...");
  
  const bucket = admin.storage().bucket();
  const diseasesSnapshot = await admin.firestore().collection('rice_local_diseases').get();

  if (diseasesSnapshot.empty) {
    throw new Error("No diseases found in Firestore");
  }

  let imagesArray = [];
  let labelsArray = [];
  const diseaseNames = [];
  let diseaseIndex = 0;

  for (const doc of diseasesSnapshot.docs) {
    const disease = doc.data();
    const diseaseName = disease.name || `Disease_${doc.id}`;
    diseaseNames.push(diseaseName);
    
    console.log(`Processing disease: ${diseaseName}`);

    if (!disease.images || !Array.isArray(disease.images) || disease.images.length === 0) {
      console.log(`No images found for disease: ${diseaseName}`);
      continue;
    }

    for (const imgPath of disease.images) {
      try {
        console.log(`Loading image: ${imgPath}`);
        
        // Handle different path formats
        let fullPath = imgPath;
        if (!imgPath.startsWith('rice_disease/')) {
          fullPath = `rice_disease/${imgPath}`;
        }

        const file = bucket.file(fullPath);
        const exists = await file.exists();
        
        if (!exists[0]) {
          console.log(`Image not found: ${fullPath}`);
          continue;
        }

        const [buffer] = await file.download();
        
        // Decode and preprocess image
        const imgTensor = tf.node.decodeImage(buffer)
          .resizeNearestNeighbor([224, 224]) // Standard input size
          .toFloat()
          .div(255.0)
          .expandDims(0); // Add batch dimension
        
        imagesArray.push(imgTensor.squeeze()); // Remove batch dimension for stacking
        
        // Create one-hot encoded label
        const label = Array(diseasesSnapshot.size).fill(0);
        label[diseaseIndex] = 1;
        labelsArray.push(label);
        
        // Clean up tensor
        imgTensor.dispose();
        
      } catch (error) {
        console.error(`Error processing image ${imgPath}:`, error);
      }
    }
    diseaseIndex++;
  }

  if (imagesArray.length === 0) {
    throw new Error("No valid images found for training");
  }

  console.log(`Loaded ${imagesArray.length} images for ${diseaseNames.length} diseases`);

  const images = tf.stack(imagesArray);
  const labels = tf.tensor2d(labelsArray);

  // Clean up individual tensors
  imagesArray.forEach(tensor => tensor.dispose());

  return { images, labels, diseaseNames };
}

export async function trainModel() {
  console.log("Starting model training...");

  try {
    const { images, labels, diseaseNames } = await getImagesAndLabels();
    
    console.log(`Training with ${images.shape[0]} images for ${diseaseNames.length} diseases`);
    
    // Create a simple CNN model
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        
        tf.layers.flatten(),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ 
          units: 128, 
          activation: 'relu' 
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ 
          units: diseaseNames.length, 
          activation: 'softmax' 
        })
      ]
    });

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    console.log("Model compiled, starting training...");

    // Train the model
    const history = await model.fit(images, labels, {
      epochs: 10,
      batchSize: 8,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc?.toFixed(4) || logs.accuracy?.toFixed(4)}`);
        }
      }
    });

    // Save model to Cloud Storage
    const modelPath = 'gs://your-bucket-name/models/rice_disease_model';
    await model.save(modelPath);
    
    // Save metadata
    const metadata = {
      modelPath,
      diseaseNames,
      trainedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalImages: images.shape[0],
      totalDiseases: diseaseNames.length,
      finalLoss: history.history.loss[history.history.loss.length - 1],
      finalAccuracy: history.history.acc?.[history.history.acc.length - 1] || history.history.accuracy?.[history.history.accuracy.length - 1]
    };

    await admin.firestore().collection('models').doc('rice_disease_latest').set(metadata);

    console.log("Model training completed and saved successfully");

    // Clean up tensors
    images.dispose();
    labels.dispose();
    model.dispose();

    return metadata;

  } catch (error) {
    console.error("Training failed:", error);
    throw error;
  }
}