import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersDir = path.join(__dirname, "data", "orders");

// Ensure orders directory exists
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir, { recursive: true });
}

function getOrderFile(reference) {
  return path.join(ordersDir, `${reference}.json`);
}

/**
 * Create a new order record (before payment)
 */
export function createOrder(reference, { amount, method, email, name, phone, itemIds = [] }) {
  const order = {
    reference,
    status: "pending", // pending, confirmed, failed, delivered
    amount,
    method,
    email,
    name,
    phone,
    itemIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    paymentConfirmedAt: null,
    deliveredAt: null,
    webhookData: null
  };

  const file = getOrderFile(reference);
  fs.writeFileSync(file, JSON.stringify(order, null, 2));
  return order;
}

/**
 * Get order by reference
 */
export function getOrder(reference) {
  const file = getOrderFile(reference);
  try {
    if (!fs.existsSync(file)) return null;
    const data = fs.readFileSync(file, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

/**
 * Update order status (e.g., pending → confirmed)
 */
export function updateOrderStatus(reference, status, webhookData = null) {
  const order = getOrder(reference);
  if (!order) {
    throw new Error(`Order not found: ${reference}`);
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  if (status === "confirmed") {
    order.paymentConfirmedAt = new Date().toISOString();
  }

  if (webhookData) {
    order.webhookData = webhookData;
  }

  const file = getOrderFile(reference);
  fs.writeFileSync(file, JSON.stringify(order, null, 2));
  return order;
}

/**
 * Mark order as delivered (after product delivery complete)
 */
export function markOrderDelivered(reference) {
  const order = getOrder(reference);
  if (!order) {
    throw new Error(`Order not found: ${reference}`);
  }

  order.status = "delivered";
  order.deliveredAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();

  const file = getOrderFile(reference);
  fs.writeFileSync(file, JSON.stringify(order, null, 2));
  return order;
}

/**
 * List all orders (for debugging/admin)
 */
export function listOrders(filter = {}) {
  try {
    if (!fs.existsSync(ordersDir)) return [];

    const files = fs.readdirSync(ordersDir);
    const orders = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const data = fs.readFileSync(path.join(ordersDir, f), "utf-8");
          return JSON.parse(data);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    // Apply filters
    if (filter.status) {
      return orders.filter((o) => o.status === filter.status);
    }
    if (filter.email) {
      return orders.filter((o) => o.email === filter.email);
    }

    return orders;
  } catch (err) {
    return [];
  }
}

/**
 * Cleanup old orders (older than days)
 */
export function cleanupOldOrders(olderThanDays = 30) {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  try {
    if (!fs.existsSync(ordersDir)) return { cleaned };

    const files = fs.readdirSync(ordersDir);
    files.forEach((f) => {
      const filePath = path.join(ordersDir, f);
      const stat = fs.statSync(filePath);

      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
  } catch (err) {
    console.error("Cleanup error:", err);
  }

  return { cleaned };
}

/**
 * Add idempotency key tracking (prevent duplicate charges)
 */
const idempotencyKeys = new Map();

export function validateIdempotencyKey(key) {
  if (!key) return true; // No idempotency key required, but allowed

  const cached = idempotencyKeys.get(key);
  if (cached) {
    return { isDuplicate: true, result: cached };
  }

  return { isDuplicate: false };
}

export function recordIdempotencyKey(key, result) {
  if (key) {
    idempotencyKeys.set(key, result);
    // Auto-cleanup after 24 hours
    setTimeout(() => {
      idempotencyKeys.delete(key);
    }, 24 * 60 * 60 * 1000);
  }
}
