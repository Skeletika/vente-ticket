// =====================================================
// 📦 GET STOCK — Returns current stock from Netlify Blobs
// =====================================================
const { getStore } = require("@netlify/blobs");

const INITIAL_STOCK = 10;

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const store = getStore({ name: "ticket-data", consistency: "strong" });

    // Try to get stock from blob store
    let stockData = await store.get("stock", { type: "json" });

    // Initialize if not exists
    if (!stockData) {
      stockData = { remaining: INITIAL_STOCK };
      await store.setJSON("stock", stockData);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ remaining: stockData.remaining }),
    };
  } catch (error) {
    console.error("Error fetching stock:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur serveur" }),
    };
  }
};
