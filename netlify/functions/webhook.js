// =====================================================
// 🔔 WEBHOOK — Stripe webhook handler
// Handles: checkout.session.completed
// - Anti-duplicate processing
// - Stock decrement
// - Email sending with ticket PDFs
// =====================================================
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { getStore } = require("@netlify/blobs");
const { sendTickets } = require("./send-ticket");

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  // 🔐 Verify Stripe signature
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ======================================================
  // 🎯 PROCESS PAYMENT
  // ======================================================
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const sessionId = session.id;
    const quantity = parseInt(session.metadata?.quantity) || 1;
    const email = session.customer_details?.email;

    const store = getStore({
      name: "ticket-data",
      consistency: "strong",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN,
    });

    // ==================================================
    // 🧠 1. ANTI-DUPLICATE (CRITICAL)
    // ==================================================
    let processed = await store.get("processed_payments", { type: "json" });
    if (!processed) processed = [];

    if (processed.includes(sessionId)) {
      console.log(`Session ${sessionId} already processed, skipping.`);
      return { statusCode: 200, body: "Already processed" };
    }

    // Mark as processed immediately
    processed.push(sessionId);
    await store.setJSON("processed_payments", processed);

    // ==================================================
    // 📦 2. STOCK MANAGEMENT
    // ==================================================
    let stockData = await store.get("stock", { type: "json" });
    if (!stockData) stockData = { remaining: 8 };

    if (stockData.remaining < quantity) {
      console.error(`STOCK INSUFFISANT for ${sessionId}`);
      return { statusCode: 200, body: "Insufficient stock" };
    }

    stockData.remaining -= quantity;
    await store.setJSON("stock", stockData);

    // ==================================================
    // 📩 3. SEND EMAIL WITH TICKETS
    // ==================================================
    try {
      const result = await sendTickets(email, quantity, store);
      if (result) {
        console.log(`✅ MAIL OK for ${email} (${quantity} tickets)`);
      } else {
        console.error(`❌ MAIL FAILED for ${email}`);
      }
    } catch (err) {
      console.error(`❌ MAIL ERROR for ${email}:`, err.message);
    }
  }

  return { statusCode: 200, body: "OK" };
};
