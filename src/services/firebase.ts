import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, setDoc, getDoc, serverTimestamp, updateDoc, increment } from "./firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { getPlanLimits } from "../utils/planLimits";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result;
};

// Connection test as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Segmento de datos: Conexión verificada con éxito.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    } else {
      // Permission errors or document missing are expected if not logged in or path changed
      // We don't throw to avoid crashing the app boot
      console.log("Firebase connection test performed.");
    }
  }
}

if (typeof window !== "undefined") {
  testConnection();
}

/**
 * Sincroniza el plan del usuario en Firestore de forma segura.
 * No sobrescribe datos existentes gracias al uso de { merge: true }.
 */
export const syncUserPlan = async (user: any) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    // Usamos merge: true para NO borrar lo que ya existe
    await setDoc(userRef, {
      email: user.email,
      subscriptionType: "free", // Valor por defecto para nuevos
      pdfCount: 0,
      isPremium: false,
      lastReset: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("Estructura de plan sincronizada para:", user.email);
  } catch (error) {
    console.error("Error al sincronizar el plan:", error);
  }
};

export const checkAndIncrementPDFLimit = async (): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Debes iniciar sesión para generar documentos.");
    return false;
  }

  const userRef = doc(db, "users", currentUser.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return false; // Should not happen
    }

    const data = snap.data();
    
    // Calcular isTrialActive basado en 7 dias.
    let isTrialActive = false;
    if (data.createdAt) {
      try {
        const createdAtDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        if (createdAtDate && !isNaN(createdAtDate.getTime())) {
          const diffMs = Date.now() - createdAtDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) { // 7 days trial
            isTrialActive = true;
          }
        }
      } catch (e) {
        console.error("Error", e);
      }
    }

    const userPlanRaw = { ...data, isTrialActive };
    const planLimits = getPlanLimits(userPlanRaw);
    
    const today = new Date().toLocaleDateString();
    
    // Handle daily counter reset
    let dailyPdfs = data.dailyPdfs || 0;
    let lastPdfDate = data.lastPdfDate || "";

    if (lastPdfDate !== today) {
      dailyPdfs = 0;
    }

    if (dailyPdfs >= planLimits.maxPdfsPerDay && planLimits.maxPdfsPerDay !== Infinity) {
      if (typeof window !== "undefined") {
         // Fallback alert instead of modal since this is inside a service
         alert(`Haz alcanzado el límite diario de ${planLimits.maxPdfsPerDay} PDFs en tu plan actual. Mejora tu plan para descargas ilimitadas.`);
      }
      return false;
    }

    // Increment count
    await updateDoc(userRef, {
      pdfCount: increment(1),
      dailyPdfs: dailyPdfs + 1,
      lastPdfDate: today,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error validando cuota de PDF", error);
    alert("No se pudo validar la suscripción. Intente nuevamente.");
    return false;
  }
};