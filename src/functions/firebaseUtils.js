import * as admin from 'firebase-admin';
import * as tf from '@tensorflow/tfjs';

export async function getImagesAndLabels() {
  const bucket = admin.storage().bucket();
  const diseasesSnapshot = await admin.firestore().collection('rice_local_diseases').get();

  let imagesArray = [];
  let labelsArray = [];
  const numDiseases = diseasesSnapshot.size;
  let index = 0;

  for (const doc of diseasesSnapshot.docs) {
    const disease = doc.data();
    for (const imgPath of disease.images) {
      const file = bucket.file(imgPath);
      const buffer = await file.download();
      const imgTensor = tf.node.decodeImage(buffer[0])
        .resizeNearestNeighbor([64,64])
        .toFloat()
        .div(255);
      imagesArray.push(imgTensor);

      const label = Array(numDiseases).fill(0);
      label[index] = 1;
      labelsArray.push(label);
    }
    index++;
  }

  const images = tf.stack(imagesArray);
  const labels = tf.tensor2d(labelsArray);

  return { images, labels };
}
