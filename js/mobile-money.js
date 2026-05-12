/**
 * Mobile Money Optimization Module
 * 
 * Cameroon-specific optimization for MTN MoMo and Orange Money
 * - Fast payment delivery
 * - Network detection
 * - Low bandwidth friendly
 * - Clear user messaging
 */

/**
 * Mobile Money networks in Cameroon
 */
export const MOBILE_NETWORKS = {
  MTN: {
    code: "mtn",
    name: "MTN Mobile Money",
    prefixes: ["67", "68"],
    priority: 1,
    supportsUSSD: true,
    supportsApp: true,
    timeoutMs: 120000, // 2 minutes for user confirmation
    minAmount: 100,    // XAF
    maxAmount: 500000  // XAF
  },
  ORANGE: {
    code: "orange",
    name: "Orange Money",
    prefixes: ["69"],
    priority: 2,
    supportsUSSD: true,
    supportsApp: true,
    timeoutMs: 120000, // 2 minutes
    minAmount: 100,
    maxAmount: 500000
  }
};

/**
 * Detect which network a phone number belongs to
 * @param {string} normalizedPhone - Phone in format +2376XXXXXXXX
 * @returns {string} - 'mtn', 'orange', or 'unknown'
 */
export function detectMobileNetwork(normalizedPhone) {
  const local = String(normalizedPhone || "").replace(/^\+237/, "");
  
  for (const [key, network] of Object.entries(MOBILE_NETWORKS)) {
    if (network.prefixes.some((prefix) => local.startsWith(prefix))) {
      return network.code;
    }
  }
  
  return "unknown";
}

/**
 * Get network configuration
 * @param {string} method - 'mtn' or 'orange'
 * @returns {object} - Network config
 */
export function getNetworkConfig(method) {
  for (const network of Object.values(MOBILE_NETWORKS)) {
    if (network.code === method) {
      return network;
    }
  }
  return null;
}

/**
 * Validate phone number for Mobile Money
 * @param {string} phone - Raw phone number
 * @returns {object} - { valid: boolean, normalized: string, network: string, error?: string }
 */
export function validateMobileMoneyPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  
  // Check length
  if (digits.length !== 9 && digits.length !== 12) {
    return {
      valid: false,
      error: "Phone number must be 9 digits (local) or 12 digits (international)"
    };
  }
  
  // Normalize
  let normalized = "";
  if (digits.length === 9) {
    // Local format: 6XXXXXXXX
    normalized = `+237${digits}`;
  } else if (digits.length === 12 && digits.startsWith("237")) {
    // International format: 2376XXXXXXXX
    normalized = `+${digits}`;
  } else {
    return {
      valid: false,
      error: "Phone number format not recognized"
    };
  }
  
  // Detect network
  const network = detectMobileNetwork(normalized);
  if (network === "unknown") {
    return {
      valid: false,
      normalized,
      error: "Phone number not on MTN or Orange network"
    };
  }
  
  return {
    valid: true,
    normalized,
    network
  };
}

/**
 * Get user-friendly name for payment method
 */
export function getPaymentMethodLabel(method) {
  const network = getNetworkConfig(method);
  if (network) return network.name;
  return method === "card" ? "Carte bancaire" : "Autre";
}

/**
 * Get user instruction for Mobile Money payment
 */
export function getMobileMoneyInstruction(method, phone) {
  const network = getNetworkConfig(method);
  if (!network) return "";
  
  const code = "141" + (method === "mtn" ? "2" : "3");
  return `Confirmez sur votre mobile ${method.toUpperCase()}`;
}

/**
 * Calculate optimal timeout for payment based on network conditions
 */
export function calculatePaymentTimeout(isSlowNetwork) {
  if (isSlowNetwork) {
    return 180000; // 3 minutes on slow networks
  }
  return 120000; // 2 minutes normally
}

/**
 * Validate payment amount for network
 */
export function validatePaymentAmount(method, amount) {
  const network = getNetworkConfig(method);
  if (!network) return { valid: true };
  
  if (amount < network.minAmount) {
    return {
      valid: false,
      error: `Montant minimum: ${network.minAmount.toLocaleString('fr-FR')} XAF`
    };
  }
  
  if (amount > network.maxAmount) {
    return {
      valid: false,
      error: `Montant maximum: ${network.maxAmount.toLocaleString('fr-FR')} XAF`
    };
  }
  
  return { valid: true };
}

/**
 * Get optimal retry strategy for Mobile Money
 */
export function getRetryStrategy() {
  return {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5
  };
}

/**
 * Log Mobile Money payment event for monitoring
 */
export function logMobileMoneyEvent(eventType, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    ...data
  };
  
  // Send to backend logging
  console.log(`[MOBILE_MONEY] ${eventType}:`, logEntry);
  
  // Store in sessionStorage for debugging
  try {
    const key = `momo_${eventType}_${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify(logEntry));
    // Cleanup old entries
    if (Math.random() < 0.1) { // Cleanup 10% of the time
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith("momo_"));
      if (keys.length > 20) {
        keys.slice(0, 10).forEach(k => sessionStorage.removeItem(k));
      }
    }
  } catch (_) {
    // Storage full or disabled
  }
}

/**
 * Get Mobile Money friendly error message
 */
export function getMobileMoneyErrorMessage(error, method) {
  const network = getNetworkConfig(method);
  const networkName = network?.name || "Mobile Money";
  
  if (error.includes("timeout") || error.includes("Timeout")) {
    return `Délai d'attente dépassé. Vérifiez que vous avez confirmé sur ${networkName} et réessayez.`;
  }
  
  if (error.includes("Invalid") || error.includes("phone")) {
    return `Numéro ${networkName} invalide. Vérifiez et réessayez.`;
  }
  
  if (error.includes("failed") || error.includes("Failed")) {
    return `Paiement ${networkName} refusé. Vérifiez votre solde et réessayez.`;
  }
  
  if (error.includes("network") || error.includes("offline")) {
    return `Problème de connexion. Vérifiez votre Internet et réessayez.`;
  }
  
  if (error.includes("cancelled") || error.includes("Cancelled")) {
    return `Paiement annulé sur ${networkName}. Réessayez si vous le souhaitez.`;
  }
  
  return `Erreur ${networkName}: ${error}`;
}

/**
 * Estimate payment delivery time based on network conditions
 */
export function estimatePaymentTime(isSlowNetwork) {
  if (isSlowNetwork) {
    return "jusqu'à 3 minutes";
  }
  return "1-2 minutes";
}

/**
 * Get Mobile Money bandwidth optimization settings
 */
export function getBandwidthOptimization(isSlowNetwork) {
  return {
    skipInitialProbe: isSlowNetwork,
    reducePollingFrequency: isSlowNetwork,
    pollIntervalMs: isSlowNetwork ? 5000 : 3000,
    maxPollingAttempts: isSlowNetwork ? 36 : 40, // 3min / 5s = 36, 2min / 3s = 40
    useCompression: isSlowNetwork,
    minPayloadSize: 256
  };
}

/**
 * Determine if user is on slow network (for optimization)
 */
export function detectSlowNetwork() {
  if (typeof navigator === "undefined") return false;
  
  if ("connection" in navigator) {
    const conn = navigator.connection;
    return (
      conn.saveData ||
      /slow-2g|2g|3g/.test(conn.effectiveType || "")
    );
  }
  
  return false;
}

/**
 * Get Mobile Money payment priority order
 */
export function getPaymentMethodPriority() {
  return [
    { method: "mtn", label: "MTN Mobile Money", priority: 1 },
    { method: "orange", label: "Orange Money", priority: 2 },
    { method: "card", label: "Carte bancaire", priority: 3 }
  ];
}
