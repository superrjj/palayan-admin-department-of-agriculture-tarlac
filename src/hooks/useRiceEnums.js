// hooks/useRiceEnums.js
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/config";

export const useRiceEnums = () => {
  const [enums, setEnums] = useState({
    seasons: [],
    plantingMethods: [],
    environments: [],
    yearReleases: []
  });

  useEffect(() => {
    const ref = doc(db, "maintenance", "rice_varieties_enums");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      setEnums({
        seasons: d.seasons || [],
        plantingMethods: d.plantingMethods || [],
        environments: d.environments || [],
        yearReleases: d.yearReleases || []
      });
    });
    return () => unsub();
  }, []);

  return enums;
};