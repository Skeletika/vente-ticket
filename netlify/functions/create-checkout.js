// =====================================================
// 🛒 CREATE CHECKOUT — Creates a Stripe Checkout Session
// =====================================================
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Parse quantity from query string
    const params = event.queryStringParameters || {};
    let quantity = parseInt(params.qty) || 1;
    if (quantity < 1) quantity = 1;
    if (quantity > 10) quantity = 10;

    // Check stock
    const store = getStore({
      name: "ticket-data",
      consistency: "strong",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN,
    });
    const stockData = await store.get("stock", { type: "json" });

    if (!stockData || stockData.remaining <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Rupture de stock" }),
      };
    }

    if (stockData.remaining < quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Seulement ${stockData.remaining} billet(s) disponible(s)`,
        }),
      };
    }

    // Determine site URL for redirects
    const siteUrl = process.env.SITE_URL || `https://${event.headers.host}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Billet Nigloland",
            },
            unit_amount: 3500, // 35,00 €
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/success.html`,
      cancel_url: `${siteUrl}/`,
      metadata: {
        quantity: quantity.toString(),
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Checkout error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur lors de la création du paiement" }),
    };
  }
};
