// =====================================================
// 📩 SEND TICKET — Email sending with PDF attachments
// Uses Nodemailer with Gmail SMTP (same as PHPMailer config)
// =====================================================
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/**
 * Send ticket PDFs by email
 * @param {string} email - Recipient email
 * @param {number} quantity - Number of tickets to send
 * @param {object} store - Netlify Blobs store instance
 * @returns {boolean} - Success status
 */
async function sendTickets(email, quantity, store) {
  if (!email) {
    console.error("No email provided");
    return false;
  }

  // ==================================================
  // 🎟️ 1. GET AVAILABLE TICKETS
  // ==================================================
  let usedData = await store.get("used_tickets", { type: "json" });
  if (!usedData || !usedData.used) {
    usedData = { used: [] };
  }

  const used = usedData.used;

  // Find available ticket IDs (1-10)
  const availableTickets = [];
  for (let i = 1; i <= 10; i++) {
    if (!used.includes(i)) {
      availableTickets.push(i);
    }
  }

  // Not enough tickets
  if (availableTickets.length < quantity) {
    console.error("Not enough tickets available");
    return false;
  }

  // Select tickets
  const selectedTickets = availableTickets.slice(0, quantity);

  // ==================================================
  // 📎 2. PREPARE ATTACHMENTS
  // ==================================================
  const attachments = [];

  for (const id of selectedTickets) {
    // Try multiple paths: local dev vs deployed Netlify function
    const possiblePaths = [
      path.resolve(__dirname, `../../billets/billet-${id}.pdf`),
      path.resolve(__dirname, `billets/billet-${id}.pdf`),
      path.resolve(process.cwd(), `billets/billet-${id}.pdf`),
    ];

    let filePath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (filePath) {
      attachments.push({
        filename: `billet-${id}.pdf`,
        path: filePath,
      });
    } else {
      console.warn(`Ticket file not found. Tried: ${possiblePaths.join(", ")}`);
    }
  }

  // ==================================================
  // 📩 3. SEND EMAIL
  // ==================================================
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Volta" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Vos billets Nigloland 🎟️",
      text: "Merci pour votre achat ! Vos billets sont en pièce jointe.",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #232F3E; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 1.5rem;">Volta</h1>
          </div>
          <div style="padding: 32px 24px; background: #ffffff;">
            <h2 style="color: #0F1111; margin-bottom: 16px;">Merci pour votre achat ! 🎉</h2>
            <p style="color: #565959; line-height: 1.6;">
              Vos ${quantity} billet(s) Nigloland sont en pièce jointe de cet email.
            </p>
            <div style="background: #F8F9FA; border: 1px solid #D5D9D9; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #0F1111;"><strong>Rappel :</strong></p>
              <ul style="color: #565959; margin: 8px 0 0 0; padding-left: 20px;">
                <li>Billets non datés — valables toute la saison 2026</li>
                <li>Billets non nominatifs</li>
                <li>Accès adulte ou enfant</li>
              </ul>
            </div>
            <p style="color: #565959; font-size: 0.9rem;">
              Un problème ? Contactez-nous à <a href="mailto:voltanika.web@gmail.com" style="color: #007185;">voltanika.web@gmail.com</a>
            </p>
          </div>
          <div style="background: #232F3E; padding: 16px; text-align: center;">
            <p style="color: #D5D9D9; font-size: 0.8rem; margin: 0;">© 2026 Volta</p>
          </div>
        </div>
      `,
      attachments: attachments,
    });

    // ==================================================
    // 🧠 4. MARK TICKETS AS USED (AFTER SUCCESSFUL SEND)
    // ==================================================
    usedData.used = [...used, ...selectedTickets];
    await store.setJSON("used_tickets", usedData);

    console.log(`Email sent to ${email} with tickets: ${selectedTickets.join(", ")}`);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

module.exports = { sendTickets };
