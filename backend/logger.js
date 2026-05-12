import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getLogFile(type = "app") {
  const now = new Date();
  const dateStamp = now.toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(logsDir, `${type}-${dateStamp}.log`);
}

function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  let log = `[${timestamp}] ${level}: ${message}`;
  if (data) {
    log += ` | ${JSON.stringify(data)}`;
  }
  return log;
}

export function logPaymentRequest(reference, method, amount, email) {
  const msg = formatLog("INFO", "PAYMENT_REQUEST", {
    reference,
    method,
    amount,
    email
  });
  fs.appendFileSync(getLogFile("payments"), msg + "\n");
  console.log(msg);
}

export function logPaymentSuccess(reference, amount, status) {
  const msg = formatLog("INFO", "PAYMENT_SUCCESS", {
    reference,
    amount,
    status
  });
  fs.appendFileSync(getLogFile("payments"), msg + "\n");
  console.log(msg);
}

export function logPaymentFailure(reference, error) {
  const msg = formatLog("WARN", "PAYMENT_FAILURE", {
    reference,
    error: error?.message || String(error)
  });
  fs.appendFileSync(getLogFile("payments"), msg + "\n");
  console.warn(msg);
}

export function logWebhook(reference, status, signature_valid) {
  const msg = formatLog("INFO", "WEBHOOK_RECEIVED", {
    reference,
    status,
    signature_valid
  });
  fs.appendFileSync(getLogFile("webhooks"), msg + "\n");
  console.log(msg);
}

export function logWebhookError(error, signature_valid) {
  const msg = formatLog("ERROR", "WEBHOOK_ERROR", {
    error: error?.message || String(error),
    signature_valid
  });
  fs.appendFileSync(getLogFile("webhooks"), msg + "\n");
  console.error(msg);
}

export function logOrder(action, reference, data = {}) {
  const msg = formatLog("INFO", `ORDER_${action}`, {
    reference,
    ...data
  });
  fs.appendFileSync(getLogFile("orders"), msg + "\n");
  console.log(msg);
}

export function logError(context, error) {
  const msg = formatLog("ERROR", context, {
    error: error?.message || String(error),
    stack: error?.stack
  });
  fs.appendFileSync(getLogFile("errors"), msg + "\n");
  console.error(msg);
}

export function createLoggerMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    const original_send = res.send;

    res.send = function (data) {
      const duration = Date.now() - start;
      const msg = formatLog("INFO", `${req.method} ${req.path}`, {
        status: res.statusCode,
        duration_ms: duration,
        body_size: String(data || "").length
      });
      fs.appendFileSync(getLogFile("requests"), msg + "\n");
      
      return original_send.call(this, data);
    };

    next();
  };
}
