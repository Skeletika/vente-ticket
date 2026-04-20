// =====================================================
// 🔄 RESET STOCK — Resets stock to 10 and clears used tickets
// =====================================================
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  // Simple security using a query parameter
  const secret = event.queryStringParameters.secret;
  if (secret !== "VOLTA2026") {
    return { statusCode: 403, body: "Forbidden" };
  }

  try {
    const store = getStore({
      name: "ticket-data",
      consistency: "strong",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN,
    });

    // Reset stock to 10
    await store.setJSON("stock", { remaining: 10 });
    
    // Clear used tickets
    await store.setJSON("used_tickets", { used: [] });
    // Also clear processed payments to allow testing again
    await store.setJSON("processed_payments", []);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Stock réinitialisé avec succès à 10 billets." }),
    };
  } catch (error) {
    console.error("Error resetting stock:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur serveur lors de la réinitialisation" }),
    };
  }
};
