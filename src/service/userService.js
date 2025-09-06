import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export const fetchUsers = async () => {
  const querySnapshot = await getDocs(collection(db, "accounts"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

