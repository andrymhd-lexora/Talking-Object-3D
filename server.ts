import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";

// dotenv setup
import dotenv from "dotenv";
dotenv.config();

// Load firebase-applet-config.json safely
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let projectId = "";
let firestoreDatabaseId = "";
try {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    projectId = config.projectId;
    firestoreDatabaseId = config.firestoreDatabaseId;
  }
} catch (err) {
  console.error("Error reading firebase-applet-config.json:", err);
}

// Initialize Firebase Admin
console.log("PROJECT DEFINED ENVIRONMENT:", {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  configProjectId: projectId,
  firestoreDatabaseId: firestoreDatabaseId
});

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectId || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    });
    console.log("Firebase Admin successfully initialized with Project ID:", projectId || process.env.FIREBASE_PROJECT_ID);
  } catch (initErr) {
    console.error("Firebase Admin initialization failed, starting without config:", initErr);
    admin.initializeApp();
  }
}

// Construct Firestore referencing the correct firestoreDatabaseId
const db = firestoreDatabaseId ? getFirestore(admin.apps[0]!, firestoreDatabaseId) : getFirestore();
console.log(`Firestore connection created. Database Selected: ${firestoreDatabaseId || "(default)"}`);

// Fallback in-memory payment DB in case Firestore Admin execution is blocked by container permissions
const paymentMemoryDb = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing request bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route: Create Mayar payment link
  app.post("/api/payment/create-link", async (req, res) => {
    console.log("=== ACCESSING DYNAMIC MAYAR LINK INTEGRATION ===");
    let cleanEmail = "";
    let clientName = "";
    try {
      const { email, name, amount } = req.body;
      const firebaseIdToken = req.headers["x-firebase-id-token"] as string;

      if (!email) {
        return res.status(400).json({ error: "Email wajib dikirimkan." });
      }

      // Check client authentication
      if (!firebaseIdToken) {
        return res.status(401).json({ error: "Unauthorized: Token Firebase ID tidak ditemukan." });
      }

      cleanEmail = String(email).toLowerCase().trim();

      try {
        const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
        const authedEmail = decodedToken.email;
        if (!authedEmail || authedEmail.toLowerCase().trim() !== cleanEmail) {
          return res.status(403).json({ error: "Forbidden: Firebase Auth Email tidak cocok dengan email pembelian." });
        }
      } catch (authErr: any) {
        console.error("Firebase Auth Verify ID token error:", authErr);
        return res.status(401).json({ error: "Unauthorized: Token Firebase tidak valid atau kedaluwarsa." });
      }

      clientName = name || cleanEmail.split("@")[0];
      const paymentAmount = Number(amount) || 150000;

      // 2. Fetch the Mayar API Key from local secrets
      const apiKey = process.env.MAYAR_API_KEY;
      if (!apiKey || apiKey.trim() === "" || apiKey === "MY_MAYAR_API_KEY") {
        console.warn("MAYAR_API_KEY not configured. Falling back to live product membership checkout link.");
        // Redirect directly to your live membership page with pre-filled credentials for maximum user convenience
        const productCheckoutUrl = `https://lexora.myr.id/m/object-3d-generator-pro/?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(clientName)}`;
        return res.json({
          success: true,
          link: productCheckoutUrl,
          simulated: true,
          message: "Membuka halaman membership Mayar.id asli karena MAYAR_API_KEY belum dikonfigurasi di panel Secrets."
        });
      }

      // 3. Coordinate with Mayar Endpoint: https://api.mayar.id/hl/v1/payment/link
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      // When Mayar redirect occurs, we capture status=success and payment_id={payment_id}
      const redirectUrl = `${appUrl}/?status=success&payment_status=success&payment_id={payment_id}`;

      // Support both snake_case and camelCase parameters for bulletproof compatibility with Mayar v1 API specs
      const payload = {
        name: "Talking Object Pro Premium Access - 3D Generator (Membership)",
        description: "Akses premium penuh Talking Object Pro untuk merancang karakter, skrip, dan video 3D.",
        amount: paymentAmount,
        
        // Redirect paths
        redirectUrl: redirectUrl,
        redirect_url: redirectUrl,
        
        // Customer structures
        customerName: clientName,
        customer_name: clientName,
        customerEmail: cleanEmail,
        customer_email: cleanEmail,

        // Associated Product/Membership Identifiers
        productId: "object-3d-generator-pro",
        product_id: "object-3d-generator-pro",
        membershipId: "object-3d-generator-pro",
        membership_id: "object-3d-generator-pro"
      };

      console.log("Initiating robust Mayar API endpoint detection sequence...");

      let response: Response | null = null;
      let resData: any = null;
      let lastError: any = null;

      const candidateEndpoints = [
        "https://api.mayar.id/hl/v1/payment/request",
        "https://api.mayar.id/hl/v1/payment/link",
        "https://api.mayar.id/hl/v1/payment",
        "https://api.mayar.id/hl/v1/payment-link"
      ];

      for (const endpoint of candidateEndpoints) {
        try {
          console.log(`Trying Mayar API: POST ${endpoint}`);
          const attemptResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const rawText = await attemptResponse.text();
          let parsedData: any = null;
          try {
            parsedData = rawText ? JSON.parse(rawText) : {};
          } catch (jsonErr) {
            parsedData = { rawResponse: rawText };
          }

          console.log(`Mayar API Response from ${endpoint} [Status: ${attemptResponse.status}]:`, JSON.stringify(parsedData));

          // If the path doesn't exist (returns 404), continue to next endpoint candidate
          if (attemptResponse.status === 404) {
            console.warn(`Endpoint ${endpoint} returned 404. Proceeding to next candidate...`);
            lastError = new Error(parsedData?.message || parsedData?.error || `HTTP 404 at ${endpoint}`);
            continue;
          }

          // Successful connection or other error (like 400, 401), we treat this endpoint as matched
          response = attemptResponse;
          resData = parsedData;
          break;
        } catch (fetchErr: any) {
          console.error(`Network or fetch failure at ${endpoint}:`, fetchErr);
          lastError = fetchErr;
        }
      }

      if (!response || !response.ok) {
        console.warn("Mayar API Connection failed or returned an error. Using live payment fallback link to ensure frictionless preview testing:", lastError || resData);
        const productCheckoutUrl = `https://lexora.myr.id/m/object-3d-generator-pro/?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(clientName)}`;
        return res.json({
          success: true,
          link: productCheckoutUrl,
          simulated: true,
          message: "Menggunakan link checkout live fallback karena API Key Mayar Anda belum memiliki konfigurasi produk yang cocok."
        });
      }

      // Adapt to standard, nested or flat variants of Mayar API link responses
      const finalLink = resData?.link || resData?.url || (resData?.data && (resData.data.link || resData.data.url || resData.data.paymentUrl)) || "";

      if (!finalLink) {
        console.warn("Could not parse final payment link from Mayar response. Falling back to live checkout link.");
        const productCheckoutUrl = `https://lexora.myr.id/m/object-3d-generator-pro/?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(clientName)}`;
        return res.json({
          success: true,
          link: productCheckoutUrl,
          simulated: true,
          message: "Menggunakan link checkout live fallback karena response API Mayar tidak terurai."
        });
      }

      return res.json({
        success: true,
        link: finalLink,
        simulated: false,
      });

    } catch (err: any) {
      console.error("Mayar link creation exception, falling back to simulated link:", err);
      const productCheckoutUrl = `https://lexora.myr.id/m/object-3d-generator-pro/?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(clientName)}`;
      return res.json({
        success: true,
        link: productCheckoutUrl,
        simulated: true,
        message: "Menggunakan link live fallback karena ada kesalahan internal: " + (err.message || String(err))
      });
    }
  });

  // API Route: Mayar.id webhook receiver
  app.post("/api/webhook/mayar", async (req, res) => {
    console.log("=== RECEIVED MAYAR.ID WEBHOOK ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    try {
      const body = req.body || {};
      const data = body.data || {};

      // 1. Extract email (primary lookup key)
      let email = body.customer_email || 
                  body.email || 
                  data.customer_email || 
                  data.email;

      // Check for nested customer definitions
      if (!email && body.customer && typeof body.customer === 'object') {
        email = body.customer.email;
      }
      if (!email && data.customer && typeof data.customer === 'object') {
        email = data.customer.email;
      }

      // 2. Extract payment status
      const status = body.payment_status || 
                     body.status || 
                     data.payment_status || 
                     data.status;

      // 3. Extract amount and transaction identifiers
      const amount = body.amount || data.amount;
      const paymentId = body.payment_id || body.id || data.payment_id || data.id || `manual_${Date.now()}`;

      if (!email) {
        console.warn("Mayar Webhook warning: customer email could not be parsed from payload");
        return res.status(400).json({ error: "customer_email atau email tidak ditemukan dalam request body webhook" });
      }

      const cleanEmail = String(email).toLowerCase().trim();

      // Authorization Verification Block
      const firebaseIdToken = req.headers["x-firebase-id-token"] as string;
      if (firebaseIdToken) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
          const authedEmail = decodedToken.email;
          if (!authedEmail || authedEmail.toLowerCase().trim() !== cleanEmail) {
            console.warn(`Simulated payment unauthorized: logged-in user (${authedEmail}) does not match target customer email (${cleanEmail})`);
            return res.status(403).json({ error: "Forbidden: Firebase ID Token email does not match targeted customer email" });
          }
          console.log(`Simulated payment verified for user: ${cleanEmail}`);
        } catch (authErr: any) {
          console.error("Simulation authentication failed:", authErr);
          return res.status(401).json({ error: "Unauthorized: Invalid or expired Firebase ID token" });
        }
      } else {
        // Checking for Mayar standard Webhook Secret Token
        const webhookSecret = process.env.MAYAR_WEBHOOK_SECRET;
        if (webhookSecret && webhookSecret.trim() !== "") {
          const authHeader = req.headers.authorization;
          if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
            console.warn("Mayar unauthorized webhook call: missing or mismatched Bearer token in Authorization header");
            return res.status(401).json({ error: "Unauthorized: Invalid or missing Mayar Webhook secret token" });
          }
        }
      }

      // Check if status represents a successful payment
      let isPaid = true;
      if (status) {
        const lowerStatus = String(status).toLowerCase();
        // Explicitly block standard failure/incomplete keywords
        if (
          lowerStatus === "failed" || 
          lowerStatus === "refunded" || 
          lowerStatus === "expired" ||
          lowerStatus === "unpaid" ||
          lowerStatus === "cancelled" ||
          lowerStatus === "pending" ||
          lowerStatus === "created"
        ) {
          isPaid = false;
        }
      }

      // Check event type from Mayar
      const lowerEvent = String(body.event || data.event || "").toLowerCase();
      if (
        lowerEvent.includes("fail") || 
        lowerEvent.includes("cancel") || 
        lowerEvent.includes("expire") || 
        lowerEvent.includes("refund") ||
        lowerEvent.includes("pending") ||
        lowerEvent.includes("created")
      ) {
        isPaid = false;
      }

      console.log(`Upserting payment for customer: ${cleanEmail}. Status: ${status}, Allowed Access: ${isPaid}`);
      
      const payloadToSave: any = {
        email: cleanEmail,
        isPaid: isPaid,
        status: status || "success",
        amount: amount || null,
        paymentId: paymentId,
        rawPayload: body
      };

      try {
        // Transactionally save payment record under '/payments/{email}' doc
        const paymentRef = db.collection("payments").doc(cleanEmail);
        await paymentRef.set({
          ...payloadToSave,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`Firebase written successfully for client: ${cleanEmail}`);
      } catch (dbErr: any) {
        const dbErrMsg = dbErr?.message || String(dbErr);
        if (dbErrMsg.includes("PERMISSION_DENIED") || dbErrMsg.includes("7") || dbErrMsg.includes("permissions")) {
          console.log(`[INFO] Firestore Admin write restricted on container environment for ${cleanEmail}. Storing in memory fallback cache.`);
        } else {
          console.log(`[INFO] Firestore Admin write status for ${cleanEmail}: ${dbErrMsg}`);
        }
        // Fallback to in-memory store so testing is never blocked by GCP permissions
        paymentMemoryDb.set(cleanEmail, {
          ...payloadToSave,
          updatedAt: new Date().toISOString()
        });
        console.log(`Saved payment fallback to memory cache for client: ${cleanEmail}`);
      }

      return res.json({ 
        success: true, 
        message: `Status pembayaran pengguna ${cleanEmail} telah diperbarui.` 
      });
    } catch (err: any) {
      console.error("Error occurred inside /api/webhook/mayar:", err);
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // API Route: Check payment status (checks both memory cache fallback and Firestore)
  app.get("/api/payment/status", async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check in-memory database fallback first
    if (paymentMemoryDb.has(cleanEmail)) {
      console.log(`Serving payment status from memory cache fallback: ${cleanEmail}`);
      return res.json({ success: true, ...paymentMemoryDb.get(cleanEmail) });
    }

    // 2. Check Firestore
    try {
      const docSnap = await db.collection("payments").doc(cleanEmail).get();
      if (docSnap.exists) {
        return res.json({ success: true, ...docSnap.data() });
      } else {
        return res.json({ success: true, isPaid: false });
      }
    } catch (dbErr: any) {
      const dbErrMsg = dbErr?.message || String(dbErr);
      if (dbErrMsg.includes("PERMISSION_DENIED") || dbErrMsg.includes("7") || dbErrMsg.includes("permissions")) {
        console.log(`[INFO] Firestore Admin read restricted on container environment for ${cleanEmail}. Direct client query fallback will be engaged.`);
      } else {
        console.log(`[INFO] Firestore Admin status check failed for ${cleanEmail}: ${dbErrMsg}`);
      }
      // Return success: false and dbFailed: true so the client understands this was a query failure
      return res.json({ success: false, isPaid: false, dbFailed: true, error: "Database accessibility limit" });
    }
  });

  // API Route: Check server health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Express server and Mayar integration are active.", projectId });
  });

  // Serve Vite application depending on environment context
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving build assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server booting. Access running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
