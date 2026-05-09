import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPaymentIntent, verifyWebhookSignature } from "./providers/cinetpay.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

const payments = new Map();

function createReference() {
  return `JNG-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function sanitizeMethod(method) {
  const value = String(method || "").toLowerCase();
  if (["mtn", "orange", "card"].includes(value)) return value;
  return "mtn";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function normalizeCameroonPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^6\d{8}$/.test(digits)) return `+237${digits}`;
  if (/^2376\d{8}$/.test(digits)) return `+${digits}`;
  return "";
}

app.get("/api/payments/health", (_req, res) => {
  res.json({ ok: true, provider: process.env.PAYMENT_PROVIDER || "cinetpay" });
});

app.post("/api/payments/initiate", async (req, res) => {
  const method = sanitizeMethod(req.body?.provider);
  const amount = Number(req.body?.amount || 0);
  const email = String(req.body?.email || "").trim();
  const name = String(req.body?.name || "").trim();
  const phone = normalizeCameroonPhone(req.body?.phone || "");

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: "Valid email is required" });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  if ((method === "mtn" || method === "orange") && !phone) {
    return res.status(400).json({ success: false, message: "Valid Mobile Money phone is required" });
  }

  const reference = createReference();
  payments.set(reference, {
    reference,
    status: "pending",
    amount,
    method,
    email,
    name,
    phone,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  try {
    const providerResult = await createPaymentIntent({
      apiKey: process.env.PAYMENT_API_KEY,
      siteId: process.env.PAYMENT_SITE_ID,
      notifyUrl: process.env.PAYMENT_NOTIFY_URL,
      returnUrl: process.env.PAYMENT_RETURN_URL,
      amount,
      currency: "XAF",
      provider: method,
      phone,
      email,
      name,
      transactionId: reference,
      description: "JENGU marketplace payment"
    });

    if (!providerResult.ok) {
      payments.set(reference, {
        ...payments.get(reference),
        status: "failed",
        updatedAt: Date.now(),
        providerMessage: providerResult.message || "Provider rejected payment"
      });

      return res.status(502).json({ success: false, message: providerResult.message || "Provider error" });
    }

    payments.set(reference, {
      ...payments.get(reference),
      status: providerResult.providerStatus || "pending",
      updatedAt: Date.now(),
      providerRaw: providerResult.providerResponse || null,
      checkoutUrl: providerResult.checkoutUrl || ""
    });

    return res.json({
      success: true,
      reference,
      status: "pending",
      checkoutUrl: providerResult.checkoutUrl || ""
    });
  } catch (error) {
    payments.set(reference, {
      ...payments.get(reference),
      status: "failed",
      updatedAt: Date.now(),
      providerMessage: error?.message || "Provider call failed"
    });

    return res.status(500).json({ success: false, message: "Unable to initialize payment" });
  }
});

app.get("/api/payments/status/:reference", (req, res) => {
  const payment = payments.get(req.params.reference);
  if (!payment) {
    return res.status(404).json({ success: false, status: "not_found" });
  }

  if (payment.status === "pending" && Date.now() - payment.createdAt > 3 * 60 * 1000) {
    payment.status = "timeout";
    payment.updatedAt = Date.now();
    payments.set(payment.reference, payment);
  }

  return res.json({
    success: true,
    reference: payment.reference,
    status: payment.status
  });
});

app.post("/api/payments/webhooks/cinetpay", (req, res) => {
  const signature = String(req.headers["x-cinetpay-signature"] || "");
  const secret = String(process.env.PAYMENT_WEBHOOK_SECRET || "");

  const valid = verifyWebhookSignature(JSON.stringify(req.body || {}), signature, secret);
  if (!valid) {
    return res.status(401).json({ ok: false });
  }

  const reference = String(req.body?.transaction_id || "");
  const providerStatus = String(req.body?.status || "").toUpperCase();
  const payment = payments.get(reference);
  if (!payment) {
    return res.status(202).json({ ok: true });
  }

  if (providerStatus === "ACCEPTED" || providerStatus === "SUCCESS") {
    payment.status = "confirmed";
  } else if (providerStatus === "REFUSED" || providerStatus === "FAILED") {
    payment.status = "failed";
  } else {
    payment.status = "pending";
  }

  payment.updatedAt = Date.now();
  payment.webhook = req.body;
  payments.set(reference, payment);

  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Payments API listening on :${port}`);
});
