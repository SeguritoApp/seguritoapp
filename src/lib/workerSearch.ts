import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { fetchWithCache } from '../services/firestore';

export const fetchPredictiveWorkers = async (
  clientId: string, 
  searchQuery: string, 
  limitNum: number = 5,
  options?: { hasIncidentsOnly?: boolean }
): Promise<any[]> => {
  if (!searchQuery || searchQuery.length < 3) return [];

  const sq = searchQuery.trim().toLowerCase();
  const sqNoSymbols = sq.replace(/[^0-9kK]/g, "");
  
  try {
    const fetchAllWorkers = async () => {
      const snap = await getDocs(collection(db, `clients/${clientId}/workers`));
      return snap.docs.map(d => ({id: d.id, ...d.data()}));
    };

    const workers = await fetchWithCache(`workers_${clientId}_all`, fetchAllWorkers);

    let results = workers.filter((w: any) => {
      const rutClean = (w.rut || "").replace(/[^0-9kK]/g, "").toLowerCase();
      const fullName = `${w.firstName || ""} ${w.paternalLastName || ""} ${w.maternalLastName || ""}`.toLowerCase();
      
      const matchesSearch = fullName.includes(sq) || 
             (sqNoSymbols.length > 0 && rutClean.includes(sqNoSymbols)) ||
             (w.rut || "").toLowerCase().includes(sq);

      if (!matchesSearch) return false;
      if (options?.hasIncidentsOnly && (!w.incidents || w.incidents.length === 0)) return false;

      return true;
    });

    return results.slice(0, limitNum);
  } catch (error) {
    console.error("fetchPredictiveWorkers error:", error);
    return [];
  }
}
