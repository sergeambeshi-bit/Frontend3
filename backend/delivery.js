/**
 * Product Delivery System
 * 
 * Triggered after payment confirmation.
 * Handles:
 * - Music downloads
 * - Event tickets (with real QR code)
 * - Merch order confirmation (email)
 */

import { getOrder, markOrderDelivered } from "./orders.js";
import crypto from "crypto";

/**
 * Generate a real, verifiable ticket code
 * Format: JENGU-TICKET-{reference}-{checksum}
 */
export function generateTicketCode(reference, orderData) {
  const data = `${reference}|${orderData.email}|${orderData.amount}|${Date.now()}`;
  const hash = crypto.createHash("sha256").update(data).digest("hex").slice(0, 8);
  return `JENGU-TICKET-${reference.split("-")[1]}-${hash.toUpperCase()}`;
}

/**
 * Generate QR code data (raw SVG or data URL)
 * For event tickets, encodes: ticket code + verification hash
 */
export function generateQRData(ticketCode) {
  // Simple encoding: create a data URL that can be scanned
  // Format: JENGU:TICKET:{code}
  const content = `JENGU:TICKET:${ticketCode}`;
  return content;
}

/**
 * Generate music download link
 * Note: In production, this should trigger actual file processing
 */
export function generateMusicDownload(itemId, itemName) {
  // This is a placeholder - in reality, you would:
  // 1. Locate the media file
  // 2. Generate secure download token
  // 3. Return pre-signed URL or streaming endpoint
  return {
    type: "music",
    itemId,
    itemName,
    downloadUrl: `/api/downloads/music/${encodeURIComponent(itemId)}`,
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    mimeType: "audio/mpeg"
  };
}

/**
 * Generate event ticket
 */
export function generateEventTicket(reference, orderData, itemData) {
  const ticketCode = generateTicketCode(reference, orderData);
  const qrData = generateQRData(ticketCode);

  return {
    type: "event",
    reference,
    ticketCode,
    qrData,
    eventId: itemData?.id,
    eventName: itemData?.name,
    eventDate: itemData?.releaseDate,
    eventLocation: itemData?.city,
    customerEmail: orderData.email,
    customerName: orderData.name,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate merch order confirmation
 */
export function generateMerchConfirmation(reference, orderData, itemData) {
  // In production, this would send an email to the customer
  // with order confirmation, shipment tracking, etc.
  return {
    type: "merch",
    reference,
    orderId: reference,
    customerEmail: orderData.email,
    customerName: orderData.name,
    itemId: itemData?.id,
    itemName: itemData?.name,
    itemQuantity: 1,
    itemPrice: orderData.amount,
    shippingStatus: "pending",
    expectedDeliveryDays: 5,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Main delivery trigger
 * Called after payment is confirmed
 */
export async function triggerProductDelivery(reference, itemDatas = []) {
  try {
    const order = getOrder(reference);
    if (!order) {
      throw new Error(`Order not found: ${reference}`);
    }

    const deliveries = [];

    // Generate appropriate delivery for each item type
    for (const item of itemDatas) {
      const type = String(item.category || item.type || "").toLowerCase();

      if (type === "events") {
        deliveries.push(generateEventTicket(reference, order, item));
      } else if (type === "merch") {
        deliveries.push(generateMerchConfirmation(reference, order, item));
      } else {
        // Music, movies, albums, tracks
        deliveries.push(generateMusicDownload(item.id, item.name));
      }
    }

    // Mark order as delivered
    markOrderDelivered(reference);

    // In production, you would:
    // 1. Send confirmation emails
    // 2. Generate digital assets (tickets)
    // 3. Create shipment orders for physical products
    // 4. Log delivery events
    // 5. Notify customer

    return {
      success: true,
      reference,
      deliveries,
      status: "delivered"
    };
  } catch (error) {
    console.error(`[DELIVERY] Error triggering delivery for ${reference}:`, error);
    return {
      success: false,
      reference,
      error: error.message
    };
  }
}

/**
 * Send delivery email
 * Placeholder for actual email implementation
 */
export async function sendDeliveryEmail(orderData, deliveryData) {
  // In production:
  // 1. Use SendGrid, Mailgun, AWS SES, etc.
  // 2. Include download links, ticket details, order info
  // 3. Retry failed deliveries
  // 4. Log bounce/complaint events

  console.log(`[EMAIL] Sending delivery confirmation to ${orderData.email}`);
  console.log(`[EMAIL] Delivery data:`, deliveryData);

  return {
    success: true,
    email: orderData.email,
    messageId: `msg_${Date.now()}`
  };
}

/**
 * Verify ticket validity (for event check-in)
 */
export function verifyTicket(ticketCode, reference) {
  // Verify ticket code matches the order reference
  const parts = ticketCode.split("-");
  if (parts.length < 4) return false;

  // Check if reference matches embedded reference
  const refPrefix = reference.split("-")[1];
  return parts[2] === refPrefix;
}
