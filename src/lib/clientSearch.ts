import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { fetchWithCache } from '../services/firestore';

export const fetchPredictiveClients = async (userId: string, searchQuery: string, limitNum: number = 10): Promise<any[]> => {
  if (!searchQuery || searchQuery.length < 3) return [];

  const sq = searchQuery.trim().toLowerCase();
  
  try {
    const fetchFn = async () => {
      const q = query(collection(db, "clients"), where("ownerId", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({id: d.id, ...d.data()}));
    };

    const clients = await fetchWithCache(`clients_${userId}`, fetchFn);

    const results = clients.filter((c: any) => 
      (c.name || "").toLowerCase().includes(sq) ||
      (c.rut || "").toLowerCase().includes(sq)
    );

    return results.slice(0, limitNum);
  } catch (error) {
    console.error("fetchPredictiveClients error:", error);
    return [];
  }
}

