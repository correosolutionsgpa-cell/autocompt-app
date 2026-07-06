export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      signerEmail,      // Destination email (required)
      signerName,       // Signer display name (optional, used in email greeting)
      signUrl,          // Unique signing link
      docTitle,         // Document title
      docSummary,       // Document summary
      companyName,      // Admin's company
      adminName,        // Admin display name
      adminEmail,       // Admin email (for reply-to)
      token,            // Unique signature token
    } = req.body;

    if (!signerEmail || !signUrl || !docTitle) {
      return res.status(400).json({ success: false, error: "signerEmail, signUrl and docTitle are required" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "DocuLegal <doculegal@autocompt.ca>";

    if (!resendApiKey) {
      return res.status(500).json({ success: false, error: "RESEND_API_KEY not configured" });
    }

    const greeting = signerName ? `Bonjour ${signerName.split(' ')[0]},` : "Bonjour,";
    const tokenShort = (token || "").slice(0, 20).toUpperCase();
    const sentAt = new Date().toLocaleString("fr-CA", { dateStyle: "full", timeStyle: "short" });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 40px 32px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">✦</div>
        <div>
          <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase">DocuLegal · AutoCompt</div>
          <div style="color:#fff;font-size:13px;font-weight:900;letter-spacing:1px">${companyName || "AutoCompt"}</div>
        </div>
      </div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;line-height:1.2">📄 Demande de signature électronique</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${docTitle}</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6">${greeting}</p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6">
        <strong>${adminName || companyName}</strong> vous invite à signer électroniquement le document suivant :
      </p>

      <!-- Document card -->
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:20px;margin-bottom:28px">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px">Document à signer</div>
        <div style="font-size:17px;font-weight:900;color:#111827;margin-bottom:6px">${docTitle}</div>
        ${docSummary ? `<div style="font-size:13px;color:#4b5563;line-height:1.5">${docSummary}</div>` : ''}
      </div>

      <!-- Legal consent notice -->
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:28px">
        <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6">
          <strong>⚖️ Consentement électronique :</strong> En cliquant sur le bouton ci-dessous, vous accusez réception de ce document et consentez à le signer électroniquement. Cet acte constitue une signature légalement valide conformément à la <em>Loi concernant le cadre juridique des technologies de l'information (LCCJTI)</em> du Québec et au <em>Code civil du Québec, art. 2827</em>.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:28px">
        <a href="${signUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding:16px 40px;border-radius:50px;box-shadow:0 4px 20px rgba(5,150,105,0.35)">
          Accepter et Signer ce Document →
        </a>
      </div>

      <p style="margin:0 0 12px;color:#6b7280;font-size:12px;line-height:1.5;text-align:center">
        Vous pouvez également copier-coller ce lien dans votre navigateur :<br>
        <span style="font-family:monospace;font-size:10px;color:#059669;word-break:break-all">${signUrl}</span>
      </p>
    </div>

    <!-- Audit footer -->
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:10px">
        🔒 Envoyé le <strong>${sentAt}</strong> · Réf: <code style="background:#f3f4f6;padding:2px 5px;border-radius:4px;font-family:monospace">${tokenShort}</code>
      </p>
      <p style="margin:0;color:#d1d5db;font-size:10px">
        Ce courriel est une preuve légale d'invitation à signer. Si vous n'attendiez pas ce document, ignorez ce courriel ou contactez <a href="mailto:${adminEmail || 'support@autocompt.ca'}" style="color:#059669">${adminEmail || 'support@autocompt.ca'}</a>.
      </p>
    </div>
  </div>
</body>
</html>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [signerEmail],
        reply_to: adminEmail || undefined,
        subject: `📄 ${companyName || "AutoCompt"} vous demande de signer : ${docTitle}`,
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Resend error:", err);
      return res.status(500).json({ success: false, error: err });
    }

    const data = await resp.json();
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error("Error sending signature invite:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
