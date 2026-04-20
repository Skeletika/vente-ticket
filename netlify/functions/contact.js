// =====================================================
// 📝 CONTACT FORM — Send email from success page
// =====================================================
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, message } = JSON.parse(event.body);

    if (!email || !message) {
      return { statusCode: 400, body: "Email and message are required" };
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Volta Contact" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL, // Send to site owner
      replyTo: email, // Reply to the user
      subject: `Nouveau message de contact - Volta`,
      text: `Vous avez reçu un nouveau message de ${email}:\n\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Nouveau message de contact</h2>
          <p><strong>De:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px;">${message}</p>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Contact form error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
