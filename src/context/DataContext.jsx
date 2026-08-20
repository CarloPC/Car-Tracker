import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVehicleId, setActiveVehicleId] = useState("all");

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const vehiclesRef = collection(db, "users", user.uid, "vehicles");
    const entriesRef = query(collection(db, "users", user.uid, "entries"), orderBy("date", "desc"));

    let vehiclesLoaded = false;
    let entriesLoaded = false;
    const maybeDoneLoading = () => {
      if (vehiclesLoaded && entriesLoaded) setLoading(false);
    };

    const unsubVehicles = onSnapshot(vehiclesRef, (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      vehiclesLoaded = true;
      maybeDoneLoading();
    });
    const unsubEntries = onSnapshot(entriesRef, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      entriesLoaded = true;
      maybeDoneLoading();
    });

    return () => {
      unsubVehicles();
      unsubEntries();
    };
  }, [user]);

  const api = useMemo(
    () => ({
      vehicles,
      entries,
      activeVehicleId,
      setActiveVehicleId,
      loading,

      async addVehicle(vehicle) {
        if (!user) return;
        const payload = { odometer: 0, color: "#f2a93b", ...vehicle };
        const ref = await addDoc(collection(db, "users", user.uid, "vehicles"), payload);
        return ref.id;
      },
      async updateVehicle(id, patch) {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid, "vehicles", id), patch);
      },
      async deleteVehicle(id) {
        if (!user) return;
        const linked = entries.filter((e) => e.vehicleId === id);
        await Promise.all(linked.map((e) => deleteDoc(doc(db, "users", user.uid, "entries", e.id))));
        await deleteDoc(doc(db, "users", user.uid, "vehicles", id));
        setActiveVehicleId((curr) => (curr === id ? "all" : curr));
      },

      async addEntry(entry) {
        if (!user) return;
        const payload = { note: "", ...entry };
        const ref = await addDoc(collection(db, "users", user.uid, "entries"), payload);
        return ref.id;
      },
      async updateEntry(id, patch) {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid, "entries", id), patch);
      },
      async deleteEntry(id) {
        if (!user) return;
        await deleteDoc(doc(db, "users", user.uid, "entries", id));
      },
    }),
    [vehicles, entries, activeVehicleId, loading, user]
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
