import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin using Application Default Credentials
// This will automatically work in Cloud Run if deployed in the same project as Firebase
try {
  if (!getApps().length) {
    initializeApp();
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- Email Helper ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // --- FLOW Integration Helpers ---
  const FLOW_API_KEY = process.env.FLOW_API_KEY;
  const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY;
  const FLOW_BASE_URL = process.env.FLOW_ENV === "production"
    ? "https://www.flow.cl/api"
    : "https://sandbox.flow.cl/api";

  const getFlowSignature = (params: Record<string, any>) => {
    if (!FLOW_SECRET_KEY) throw new Error("FLOW_SECRET_KEY is required for signature");
    const keys = Object.keys(params).sort();
    const stringParams = keys.map(key => `${key}=${params[key]}`).join("&");
    return crypto.createHmac("sha256", FLOW_SECRET_KEY).update(stringParams).digest("hex");
  };

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "Segurito API is running",
      flowConfigured: !!(FLOW_API_KEY && FLOW_SECRET_KEY)
    });
  });

  // Create FLOW Subscription Request
  app.post("/api/flow/create-subscription", async (req, res) => {
    console.log("Flow: Creating subscription request...");
    try {
      const apiKey = process.env.FLOW_API_KEY;
      const secretKey = process.env.FLOW_SECRET_KEY;
      const env = process.env.FLOW_ENV || "sandbox";
      const baseUrl = env === "production" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

      const { email, planId, userId, name } = req.body;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      if (!apiKey || !secretKey) {
        console.warn("Flow Configuration missing. Simulating successful subscription creation...");
        
        // Simulating the webhook behavior by immediately updating the user's plan
        await getFirestore().collection("users").doc(userId).set({
          subscriptionType: planId,
          isPremium: planId !== 'free',
          flowPlanId: planId,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({
          redirectUrl: `${appUrl}/billing-success?simulated=true`
        });
      }

      // Step 1: Create or Get Customer in Flow
      const customerParams: any = {
        apiKey,
        customerId: userId.slice(0, 50),
        name: name || "Cliente Segurito",
        email: email,
        externalId: userId
      };

      let keys = Object.keys(customerParams).sort();
      let stringParams = keys.map(key => `${key}=${customerParams[key]}`).join("&");
      customerParams.s = crypto.createHmac("sha256", secretKey).update(stringParams).digest("hex");

      let formData = new URLSearchParams();
      Object.keys(customerParams).forEach(key => formData.append(key, customerParams[key]));

      let flowResponse = await fetch(`${baseUrl}/customer/create`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      let flowData = await flowResponse.json();
      
      // If customer already exists, flow API returns error 201. We can just ignore and proceed.
      // Now Register Credit Card (this gives us the URL)
      const registerParams: any = {
        apiKey,
        customerId: userId.slice(0, 50),
        url_return: `${appUrl}/billing-success`
      };

      keys = Object.keys(registerParams).sort();
      stringParams = keys.map(key => `${key}=${registerParams[key]}`).join("&");
      registerParams.s = crypto.createHmac("sha256", secretKey).update(stringParams).digest("hex");

      formData = new URLSearchParams();
      Object.keys(registerParams).forEach(key => formData.append(key, registerParams[key]));

      const registerResponse = await fetch(`${baseUrl}/customer/register`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const registerData = await registerResponse.json();

      if (registerData.token && registerData.url) {
         // Save the pending intent to DB
         await getFirestore().collection("users").doc(userId).set({
           pendingSubscriptionPlanId: planId,
           flowCustomerId: userId.slice(0, 50)
         }, { merge: true });

         res.json({
           redirectUrl: `${registerData.url}?token=${registerData.token}`
         });
      } else {
        // Fallback: Just use basic payment gateway simulation
         res.status(400).json({ error: "FlowRegistrationFailed", details: registerData });
      }
    } catch (error: any) {
      console.error("Flow Subscription Internal Error:", error);
      res.status(500).json({ error: "InternalServerError", message: error.message });
    }
  });

  // FLOW Confirmation Webhook for Subscriptions (Card Registration)
  app.post("/api/flow/confirm", async (req, res) => {
    try {
      const { token } = req.body;
      const apiKey = process.env.FLOW_API_KEY;
      const secretKey = process.env.FLOW_SECRET_KEY;
      const env = process.env.FLOW_ENV || "sandbox";
      const baseUrl = env === "production" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

      if (!apiKey || !secretKey) return res.status(200).send("OK");

      // Verify the registered card status
      const params: any = { apiKey, token };
      const keys = Object.keys(params).sort();
      const stringParams = keys.map(key => `${key}=${params[key]}`).join("&");
      const signature = crypto.createHmac("sha256", secretKey).update(stringParams).digest("hex");
      
      const response = await fetch(`${baseUrl}/customer/getRegisterStatus?apiKey=${apiKey}&token=${token}&s=${signature}`);
      const data = await response.json();
      
      if (data.status === 1 && data.customerId) {
        // Find which user has this customerId
        const usersSnap = await getFirestore().collection("users").where("flowCustomerId", "==", data.customerId).limit(1).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const userData = userDoc.data();
          const planId = userData.pendingSubscriptionPlanId;

          if (planId) {
            // Subscribe them!
            const subParams: any = {
              apiKey,
              planId,
              customerId: data.customerId
            };
            const subKeys = Object.keys(subParams).sort();
            const subStringParams = subKeys.map(key => `${key}=${subParams[key]}`).join("&");
            subParams.s = crypto.createHmac("sha256", secretKey).update(subStringParams).digest("hex");

            const formData = new URLSearchParams();
            Object.keys(subParams).forEach(key => formData.append(key, subParams[key]));

            // Prevent double-creating by deleting the pending plan first
            await getFirestore().collection("users").doc(userDoc.id).set({
              pendingSubscriptionPlanId: FieldValue.delete()
            }, { merge: true });

            try {
              await fetch(`${baseUrl}/subscription/create`, {
                 method: 'POST',
                 body: formData,
                 headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
              });

              await getFirestore().collection("users").doc(userDoc.id).set({
                subscriptionType: planId,
                isPremium: planId !== 'free',
                flowPlanId: planId,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (err) {
              await getFirestore().collection("users").doc(userDoc.id).set({
                pendingSubscriptionPlanId: planId
              }, { merge: true });
            }
          }
        }
      }
      
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook processing error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle Flow POST return
  app.post("/billing-success", (req, res) => {
    const token = req.body.token || "";
    res.redirect(`/billing-success?token_flow=${token}`);
  });

  // Check Flow Payment Status for Frontend
  app.get("/api/flow/status", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) return res.status(400).json({ error: "No token provided" });

      const apiKey = process.env.FLOW_API_KEY;
      const secretKey = process.env.FLOW_SECRET_KEY;
      const env = process.env.FLOW_ENV || "sandbox";
      const baseUrl = env === "production" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

      if (!apiKey || !secretKey) {
         // simulation fallback
         return res.json({ status: 1, simulated: true });
      }

      const params: any = { apiKey, token };
      const keys = Object.keys(params).sort();
      const stringParams = keys.map(key => `${key}=${params[key]}`).join("&");
      const signature = crypto.createHmac("sha256", secretKey).update(stringParams).digest("hex");
      
      const statusUrl = `${baseUrl}/customer/getRegisterStatus?apiKey=${apiKey}&token=${token}&s=${signature}`;
      const response = await fetch(statusUrl);
      const data = await response.json();

      if (data.status === 1 && data.customerId) {
        const usersSnap = await getFirestore().collection("users").where("flowCustomerId", "==", data.customerId).limit(1).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const userData = userDoc.data();
          const planId = userData.pendingSubscriptionPlanId;

          if (planId) {
            // Subscribe them!
            const subParams: any = {
              apiKey,
              planId,
              customerId: data.customerId
            };
            const subKeys = Object.keys(subParams).sort();
            const subStringParams = subKeys.map(key => `${key}=${subParams[key]}`).join("&");
            subParams.s = crypto.createHmac("sha256", secretKey).update(subStringParams).digest("hex");

            const formData = new URLSearchParams();
            Object.keys(subParams).forEach(key => formData.append(key, subParams[key]));

            // Prevent double-creating by deleting the pending plan first
            await getFirestore().collection("users").doc(userDoc.id).set({
              pendingSubscriptionPlanId: FieldValue.delete()
            }, { merge: true });

            try {
              await fetch(`${baseUrl}/subscription/create`, {
                 method: 'POST',
                 body: formData,
                 headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
              });

              await getFirestore().collection("users").doc(userDoc.id).set({
                subscriptionType: planId,
                isPremium: planId !== 'free',
                flowPlanId: planId,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (createErr) {
              // Restore pending if failed
              await getFirestore().collection("users").doc(userDoc.id).set({
                pendingSubscriptionPlanId: planId
              }, { merge: true });
            }
          }
        }
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error getting flow status:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Welcome Email Route
  app.post("/api/send-welcome", async (req, res) => {
    const { email, displayName } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const subject = `¡Holi ${displayName || 'Prevencionista'}! Bienvenid@ a Segurito 🧡`;
    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
          <div style="background-color: #f97316; padding: 40px; text-align: center; border-radius: 20px 20px 0 0;">
             <h1 style="color: white; margin: 0; font-size: 32px; letter-spacing: -1px;">Segurito</h1>
          </div>
          <div style="padding: 40px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px;">
            <h2 style="color: #0f172a; margin-top: 0;">¡Qué alegría tenerte con nosotros!</h2>
            <p style="font-size: 16px; line-height: 1.6;">Hola <strong>${displayName || 'profesional'}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6;">Te damos la más cálida bienvenida a <strong>Segurito</strong>, tu nuevo aliado en la gestión de seguridad y salud en el trabajo.</p>
            <p style="font-size: 16px; line-height: 1.6;">Sabemos que tu labor es vital para cuidar a las personas, y nuestra misión es hacer que ese trabajo sea más simple, ordenado y, por qué no, ¡un poco más entretenido!</p>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 12px;">
              <p style="margin: 0; font-weight: bold; color: #0f172a;">¿Qué puedes hacer ahora?</p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Crea a tus primeros clientes y trabajadores.</li>
                <li style="margin-bottom: 8px;">Genera reportes de accidentes en segundos.</li>
                <li style="margin-bottom: 8px;">Explora nuestra matriz IPER interactiva.</li>
              </ul>
            </div>

            <p style="font-size: 16px; line-height: 1.6;">Cualquier duda que tengas, solo responde a este mail. ¡Estamos aquí para apañarte!</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 40px;">Un abrazo gigante,<br><strong>El equipo de Segurito 🧡</strong></p>
          </div>
          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            © 2024 Segurito. La plataforma para prevencionistas que aman lo que hacen.
          </div>
        </div>
      `;

    // SMTP / Simulation Logic
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Segurito" <hola@segurito.cl>',
      to: email,
      subject: subject,
      html: htmlContent,
    };

    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("SMTP credentials not found. Welcome email simulated for:", email);
        return res.json({ 
          success: true, 
          message: "Email simulated (SMTP not configured)", 
          preview: subject
        });
      }

      await transporter.sendMail(mailOptions);
      console.log("Welcome email sent via SMTP to:", email);
      res.json({ success: true, method: "smtp" });
    } catch (error: any) {
      console.error("Error sending welcome email via SMTP:", error);
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });

  // --- Vite Middleware ---
  const isProd = process.env.NODE_ENV === "production" || process.argv[1]?.endsWith("server.cjs");

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = '';
    if (typeof __dirname !== 'undefined') {
      // In CJS bundle (dist/server.cjs), __dirname points exactly to the dist directory
      distPath = __dirname;
    } else {
      distPath = path.join(process.cwd(), 'dist');
    }
    console.log("Serving static files from:", distPath);
    
    app.use((req, res, next) => {
      if (req.url.startsWith('/assets/')) {
        console.log(`[STATIC] Requesting ${req.url} from ${distPath}`);
      }
      next();
    });
    
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (path.includes('/assets/')) {
          // Assets are hashed so they can be cached indefinitely
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    // If an asset is not found by the static middleware, return a 404 instead of falling back to index.html
    app.get('/assets/*', (req, res) => {
      res.status(404).send('Asset not found');
    });

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Segurito running on port ${PORT}`);
  });
}

startServer();
