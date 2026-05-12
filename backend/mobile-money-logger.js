import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "logs", "mobile-money");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getLogFile(type = "events") {
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

/**
 * Log Mobile Money payment initiation
 */
export function logMobileMoneyInitiation(reference, method, amount, phone, email) {
  const msg = formatLog("INFO", "MOBILE_MONEY_INITIATION", {
    reference,
    method: method.toUpperCase(),
    amount,
    phone: phone ? phone.slice(-4) : "N/A", // Log last 4 digits only
    email: email ? email.split("@")[0] : "N/A"
  });
  fs.appendFileSync(getLogFile("events"), msg + "\n");
  console.log(`[MOBILE_MONEY] ${msg}`);
}

/**
 * Log network detection
 */
export function logNetworkDetection(phone, network) {
  const msg = formatLog("INFO", "NETWORK_DETECTED", {
    phone: phone ? phone.slice(-4) : "N/A",
    network: network.toUpperCase()
  });
  fs.appendFileSync(getLogFile("network"), msg + "\n");
}

/**
 * Log phone validation
 */
export function logPhoneValidation(phone, valid, error = null) {
  const msg = formatLog(valid ? "INFO" : "WARN", "PHONE_VALIDATION", {
    phone: phone ? phone.slice(-4) : "N/A",
    valid,
    error
  });
  fs.appendFileSync(getLogFile("validation"), msg + "\n");
}

/**
 * Log Mobile Money payment confirmation
 */
export function logMobileMoneyConfirmation(reference, method, status, webhookStatus = null) {
  const msg = formatLog("INFO", "MOBILE_MONEY_CONFIRMED", {
    reference,
    method: method.toUpperCase(),
    status,
    webhookStatus
  });
  fs.appendFileSync(getLogFile("confirmations"), msg + "\n");
  console.log(`[MOBILE_MONEY] ${msg}`);
}

/**
 * Log Mobile Money payment failure
 */
export function logMobileMoneyFailure(reference, method, error, reason) {
  const msg = formatLog("WARN", "MOBILE_MONEY_FAILED", {
    reference,
    method: method.toUpperCase(),
    error: error?.message || error,
    reason
  });
  fs.appendFileSync(getLogFile("failures"), msg + "\n");
  console.warn(`[MOBILE_MONEY] ${msg}`);
}

/**
 * Log Mobile Money timeout
 */
export function logMobileMoneyTimeout(reference, method, duration) {
  const msg = formatLog("WARN", "MOBILE_MONEY_TIMEOUT", {
    reference,
    method: method.toUpperCase(),
    duration_ms: duration
  });
  fs.appendFileSync(getLogFile("timeouts"), msg + "\n");
  console.warn(`[MOBILE_MONEY] ${msg}`);
}

/**
 * Log webhook received for Mobile Money
 */
export function logMobileMoneyWebhook(reference, status, signature_valid) {
  const msg = formatLog("INFO", "MOBILE_MONEY_WEBHOOK", {
    reference,
    status: status.toUpperCase(),
    signature_valid
  });
  fs.appendFileSync(getLogFile("webhooks"), msg + "\n");
  console.log(`[MOBILE_MONEY] ${msg}`);
}

/**
 * Log retry attempt
 */
export function logMobileMoneyRetry(reference, method, attempt, reason) {
  const msg = formatLog("INFO", "MOBILE_MONEY_RETRY", {
    reference,
    method: method.toUpperCase(),
    attempt,
    reason
  });
  fs.appendFileSync(getLogFile("retries"), msg + "\n");
  console.log(`[MOBILE_MONEY] Retry ${attempt} for ${reference}: ${reason}`);
}

/**
 * Log network condition (slow/fast)
 */
export function logNetworkCondition(isSlowNetwork, effectiveType) {
  const msg = formatLog("INFO", "NETWORK_CONDITION", {
    slow: isSlowNetwork,
    effectiveType
  });
  fs.appendFileSync(getLogFile("network-conditions"), msg + "\n");
}

/**
 * Generate Mobile Money payment summary
 */
export function generateMobileMoneyStats(date = null) {
  const targetDate = date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  const eventFile = path.join(logsDir, `events-${targetDate}.log`);
  const failureFile = path.join(logsDir, `failures-${targetDate}.log`);
  const confirmationFile = path.join(logsDir, `confirmations-${targetDate}.log`);
  const timeoutFile = path.join(logsDir, `timeouts-${targetDate}.log`);

  let stats = {
    date: targetDate,
    total_initiated: 0,
    total_confirmed: 0,
    total_failed: 0,
    total_timeout: 0,
    by_method: {
      mtn: { initiated: 0, confirmed: 0, failed: 0, timeout: 0 },
      orange: { initiated: 0, confirmed: 0, failed: 0, timeout: 0 }
    },
    success_rate: 0
  };

  try {
    if (fs.existsSync(eventFile)) {
      const content = fs.readFileSync(eventFile, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line) => {
        if (line.includes("MOBILE_MONEY_INITIATION")) {
          stats.total_initiated++;
          if (line.includes("MTN")) stats.by_method.mtn.initiated++;
          if (line.includes("ORANGE")) stats.by_method.orange.initiated++;
        }
      });
    }

    if (fs.existsSync(confirmationFile)) {
      const content = fs.readFileSync(confirmationFile, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line) => {
        if (line.includes("MOBILE_MONEY_CONFIRMED")) {
          stats.total_confirmed++;
          if (line.includes("MTN")) stats.by_method.mtn.confirmed++;
          if (line.includes("ORANGE")) stats.by_method.orange.confirmed++;
        }
      });
    }

    if (fs.existsSync(failureFile)) {
      const content = fs.readFileSync(failureFile, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line) => {
        if (line.includes("MOBILE_MONEY_FAILED")) {
          stats.total_failed++;
          if (line.includes("MTN")) stats.by_method.mtn.failed++;
          if (line.includes("ORANGE")) stats.by_method.orange.failed++;
        }
      });
    }

    if (fs.existsSync(timeoutFile)) {
      const content = fs.readFileSync(timeoutFile, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line) => {
        if (line.includes("MOBILE_MONEY_TIMEOUT")) {
          stats.total_timeout++;
          if (line.includes("MTN")) stats.by_method.mtn.timeout++;
          if (line.includes("ORANGE")) stats.by_method.orange.timeout++;
        }
      });
    }

    stats.success_rate =
      stats.total_initiated > 0
        ? ((stats.total_confirmed / stats.total_initiated) * 100).toFixed(2)
        : 0;
  } catch (err) {
    console.error("Error generating stats:", err);
  }

  return stats;
}

/**
 * Get recent Mobile Money payment issues (last 24 hours)
 */
export function getRecentIssues(limitPerType = 10) {
  const issues = {
    failures: [],
    timeouts: [],
    retries: []
  };

  try {
    const targetDate = new Date().toISOString().split("T")[0];
    const failureFile = path.join(logsDir, `failures-${targetDate}.log`);
    const timeoutFile = path.join(logsDir, `timeouts-${targetDate}.log`);
    const retryFile = path.join(logsDir, `retries-${targetDate}.log`);

    if (fs.existsSync(failureFile)) {
      const content = fs.readFileSync(failureFile, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      issues.failures = lines.slice(-limitPerType);
    }

    if (fs.existsSync(timeoutFile)) {
      const content = fs.readFileSync(timeoutFile, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      issues.timeouts = lines.slice(-limitPerType);
    }

    if (fs.existsSync(retryFile)) {
      const content = fs.readFileSync(retryFile, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      issues.retries = lines.slice(-limitPerType);
    }
  } catch (err) {
    console.error("Error retrieving issues:", err);
  }

  return issues;
}

/**
 * Export Mobile Money logs for analysis
 */
export function exportMobileMoneyLogs(startDate, endDate, format = "json") {
  const logs = {
    date_range: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    files: []
  };

  try {
    const files = fs.readdirSync(logsDir);
    files.forEach((file) => {
      const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
      logs.files.push({
        name: file,
        lines: content.split("\n").filter((l) => l.trim()).length,
        sample: content.split("\n").slice(0, 5)
      });
    });
  } catch (err) {
    console.error("Error exporting logs:", err);
  }

  return logs;
}
