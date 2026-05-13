import {
  setDoc as originalSetDoc,
  updateDoc as originalUpdateDoc,
  deleteDoc as originalDeleteDoc,
  addDoc as originalAddDoc,
  writeBatch as originalWriteBatch,
} from "firebase/firestore";

// Global Memory Cache for Applet
export const appCache = new Map<string, { data: any, timestamp: number }>();

export type CacheEvent = "hit" | "miss" | "clear";
export type CacheListener = (event: CacheEvent, key: string) => void;
const listeners: CacheListener[] = [];

export const addCacheListener = (listener: CacheListener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
};

const notifyListeners = (event: CacheEvent, key: string) => {
  listeners.forEach((l) => l(event, key));
};

export const clearAppCache = (prefix?: string) => {
  if (prefix) {
    for (const key of appCache.keys()) {
      if (key.startsWith(prefix)) {
        appCache.delete(key);
      }
    }
  } else {
    appCache.clear();
  }
  notifyListeners("clear", prefix || "all");
};

export const fetchWithCache = async <T,>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  forceRefresh: boolean = false,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default TTL
): Promise<T> => {
  if (!forceRefresh) {
    const cached = appCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < maxAgeMs)) {
      notifyListeners("hit", cacheKey);
      return cached.data as T;
    }
  }
  
  notifyListeners("miss", cacheKey);
  const data = await fetchFn();
  appCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

const invalidateByPath = (path: string) => {
  if (!path) return;
  // Examples of path: 
  // clients/clientId123/workers/workerId456 -> parts: ['clients', 'clientId123', 'workers', 'workerId456']
  const parts = path.split("/");
  if (parts.length >= 3 && parts[0] === "clients") {
    const clientId = parts[1];
    const collectionName = parts[2];

    if (collectionName === "workers") clearAppCache(`workers_${clientId}`);
    else if (collectionName === "gantt_tasks") { clearAppCache(`gantt_tasks_${clientId}`); clearAppCache(`gantt_tasks_list_${clientId}`); }
    else if (collectionName === "reports") { clearAppCache(`library_reports_${clientId}`); clearAppCache(`library_data_${clientId}`); clearAppCache(`inspection_reports_${clientId}`); }
    else if (collectionName === "diep_records") { clearAppCache(`library_diep_${clientId}`); clearAppCache(`library_data_${clientId}`); }
    else if (collectionName === "diat_records") { clearAppCache(`library_diat_${clientId}`); clearAppCache(`library_data_${clientId}`); }
    else if (collectionName === "irl_records") { clearAppCache(`library_irl_${clientId}`); clearAppCache(`library_data_${clientId}`); }
    else if (collectionName === "irl_templates") clearAppCache(`irl_templates_${clientId}`);
    else if (collectionName === "custom_minsal_protocols") clearAppCache(`custom_minsal_protocols_${clientId}`);
    else if (collectionName === "miper_risks") clearAppCache(`miper_risks_${clientId}`);
    else if (collectionName === "inspections") { clearAppCache(`inspections_${clientId}`); clearAppCache(`generic_inspections_${clientId}`); }
    else if (collectionName === "accidents" || collectionName === "accidents_metrics") clearAppCache(`accidents_${clientId}`);
    else if (collectionName === "grd_inspections") clearAppCache(`grd_${clientId}`);
    else if (collectionName === "minsal_audits") { clearAppCache(`minsal_${clientId}`); clearAppCache(`minsal_audits_${clientId}`); }
    else if (collectionName === "iper_matrices") clearAppCache(`iper_${clientId}`);
    else if (collectionName === "parity_committees") clearAppCache(`parity_committees_${clientId}`);

    // Invalidate everything for this client just in case
    clearAppCache(`all_data_${clientId}`);
  } else if (parts[0] === "clients" && parts.length <= 2) {
    // client itself updated or new client added
    clearAppCache("dashboard_clients");
    clearAppCache("clients_");
  } else if (parts[0] === "users") {
    clearAppCache(`dashboard_clients_${parts[1]}`); clearAppCache(`dashboard_clients_list_${parts[1]}`);
  }
};

export const addDoc = async (reference: any, data: any) => {
  const result = await originalAddDoc(reference, data);
  invalidateByPath(reference.path);
  return result;
};

export const setDoc = async (reference: any, data: any, options?: any) => {
  const result = await originalSetDoc(reference, data, options);
  invalidateByPath(reference.path);
  return result;
};

export const updateDoc = async (reference: any, ...rest: any[]) => {
  const result = await (originalUpdateDoc as any)(reference, ...rest);
  invalidateByPath(reference.path);
  return result;
};

export const deleteDoc = async (reference: any) => {
  const result = await originalDeleteDoc(reference);
  invalidateByPath(reference.path);
  return result;
};

export const writeBatch = (firestore: any) => {
  const batch = originalWriteBatch(firestore);
  const originalCommit = batch.commit.bind(batch);
  const pathsToInvalidate = new Set<string>();

  const originalSet = batch.set.bind(batch);
  batch.set = (ref: any, ...rest: any[]) => {
    if (ref.path) pathsToInvalidate.add(ref.path);
    return originalSet(ref, ...rest);
  };
  const originalUpdate = batch.update.bind(batch);
  batch.update = (ref: any, ...rest: any[]) => {
    if (ref.path) pathsToInvalidate.add(ref.path);
    return originalUpdate(ref, ...rest);
  };
  const originalDelete = batch.delete.bind(batch);
  batch.delete = (ref: any) => {
    if (ref.path) pathsToInvalidate.add(ref.path);
    return originalDelete(ref);
  };

  batch.commit = async () => {
    const result = await originalCommit();
    pathsToInvalidate.forEach(path => invalidateByPath(path));
    return result;
  };
  return batch;
};

export * from "firebase/firestore";
