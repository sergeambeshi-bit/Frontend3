import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPaymentIntent, verifyWebhookSignature } from "./providers/cinetpay.js";
import { createLoggerMiddleware, logPaymentRequest, logPaymentSuccess, logPaymentFailure, logWebhook, logWebhookError, logOrder, logError } from "./logger.js";
import { createOrder, getOrder, updateOrderStatus, validateIdempotencyKey, recordIdempotencyKey, listOrders } from "./orders.js";
import { triggerProductDelivery } from "./delivery.js";
import { logMobileMoneyInitiation, logNetworkDetection, logPhoneValidation, logMobileMoneyConfirmation, logMobileMoneyFailure, logMobileMoneyTimeout, generateMobileMoneyStats, getRecentIssues } from "./mobile-money-logger.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());
app.use(createLoggerMiddleware());

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

app.get("/api/payments/mobile-money/stats", (_req, res) => {
  const stats = generateMobileMoneyStats();
  res.json(stats);
});

app.get("/api/payments/mobile-money/issues", (_req, res) => {
  const issues = getRecentIssues(10);
  res.json(issues);
});

app.get("/api/orders/:reference", (req, res) => {
  const order = getOrder(req.params.reference);
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  return res.json({
    success: true,
    reference: order.reference,
    status: order.status,
    amount: order.amount,
    method: order.method,
    email: order.email,
    createdAt: order.createdAt,
    confirmedAt: order.paymentConfirmedAt,
    deliveredAt: order.deliveredAt
  });
});


app.post("/api/payments/initiate", async (req, res) => {
  const idempotencyKey = String(req.headers["idempotency-key"] || "");
  const method = sanitizeMethod(req.body?.provider);
  const amount = Number(req.body?.amount || 0);
  const email = String(req.body?.email || "").trim();
  const name = String(req.body?.name || "").trim();
  const phone = normalizeCameroonPhone(req.body?.phone || "");

  // Check idempotency key
  if (idempotencyKey) {
    const check = validateIdempotencyKey(idempotencyKey);
    if (check.isDuplicate) {
      console.log(`[PAYMENT] Duplicate request (idempotency key: ${idempotencyKey})`);
      return res.status(200).json(check.result);
    }
  }

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
  
  try {
    // Create persistent order record BEFORE calling payment provider
    const order = createOrder(reference, {
      amount,
      method,
      email,
      name,
      phone,
      itemIds: req.body?.itemIds || []
    });

    logPaymentRequest(reference, method, amount, email);
    
    // Log Mobile Money specific event
    if (method === "mtn" || method === "orange") {
      logMobileMoneyInitiation(reference, method, amount, phone, email);
      logPhoneValidation(phone, true);
    }

    // Also keep in-memory record for polling
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
      updateOrderStatus(reference, "failed");
      logPaymentFailure(reference, new Error(providerResult.message));
      
      // Log Mobile Money specific failure
      if (method === "mtn" || method === "orange") {
        logMobileMoneyFailure(reference, method, providerResult.message, "provider_rejected");
      }

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

    const response = {
      success: true,
      reference,
      status: "pending",
      checkoutUrl: providerResult.checkoutUrl || ""
    };

    if (idempotencyKey) {
      recordIdempotencyKey(idempotencyKey, response);
    }

    return res.json(response);
  } catch (error) {
    logPaymentFailure(reference, error);
    logError("PaymentInitiation", error);
    
    // Log Mobile Money specific failure
    if (method === "mtn" || method === "orange") {
      logMobileMoneyFailure(reference, method, error, "exception_during_initiation");
    }
    
    updateOrderStatus(reference, "failed");
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

app.post("/api/payments/webhooks/cinetpay", async (req, res) => {
  const signature = String(req.headers["x-cinetpay-signature"] || "");
  const secret = String(process.env.PAYMENT_WEBHOOK_SECRET || "");

  const valid = verifyWebhookSignature(JSON.stringify(req.body || {}), signature, secret);
  
  const reference = String(req.body?.transaction_id || "");
  const providerStatus = String(req.body?.status || "").toUpperCase();

  logWebhook(reference, providerStatus, valid);

  if (!valid) {
    logWebhookError(new Error("Invalid signature"), false);
    return res.status(401).json({ ok: false });
  }

  try {
    // Get persistent order record
    const order = getOrder(reference);
    if (!order) {
      console.log(`[PAYMENT] Order not found: ${reference} - accepting webhook anyway`);
      // Still accept the webhook (202) to prevent provider retries
      return res.status(202).json({ ok: true });
    }

    // Update order status based on provider response
    if (providerStatus === "ACCEPTED" || providerStatus === "SUCCESS") {
      updateOrderStatus(reference, "confirmed", req.body);
      logPaymentSuccess(reference, order.amount, "confirmed");
      logOrder("CONFIRMED", reference, { method: order.method });

      // Log Mobile Money specific confirmation
      if (order.method === "mtn" || order.method === "orange") {
        logMobileMoneyConfirmation(reference, order.method, "confirmed", providerStatus);
      }

      // Trigger product delivery ASAP
      // Note: itemIds should have been stored during order creation
      const deliveryResult = await triggerProductDelivery(reference, []);
      logOrder("DELIVERY_TRIGGERED", reference, {
        deliverySuccess: deliveryResult.success,
        itemCount: deliveryResult.deliveries?.length || 0
      });
    } else if (providerStatus === "REFUSED" || providerStatus === "FAILED") {
      updateOrderStatus(reference, "failed", req.body);
      logPaymentFailure(reference, new Error(`Provider status: ${providerStatus}`));
      logOrder("FAILED", reference, { method: order.method });
      
      // Log Mobile Money specific failure
      if (order.method === "mtn" || order.method === "orange") {
        logMobileMoneyFailure(reference, order.method, `Provider status: ${providerStatus}`, "webhook_failure");
      }
    } else {
      // Pending or other status
      return res.status(202).json({ ok: true });
    }

    // Also update in-memory cache
    const payment = payments.get(reference);
    if (payment) {
      payment.status = order.status;
      payment.updatedAt = Date.now();
      payment.webhook = req.body;
      payments.set(reference, payment);
    }

    return res.json({ ok: true });
  } catch (error) {
    logError("WebhookProcessing", error);
    return res.status(500).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`Payments API listening on :${port}`);
  console.log(`Frontend origin: ${frontendOrigin}`);
  console.log(`Payment provider: ${process.env.PAYMENT_PROVIDER || "cinetpay"}`);
});
