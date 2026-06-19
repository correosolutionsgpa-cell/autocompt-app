// Vercel Serverless Function — DocuLegal Email Delivery
// This file is automatically deployed as /api/save-signed-document on Vercel

import type { IncomingMessage, ServerResponse } from 'node:http';

interface RequestBody {
  pdfBase64?: string;
  adminEmail?: string;
  clientEmail?: string;
  clientName?: string;
  docTitle?: string;
  companyName?: string;
  token?: string;
  driveAccessToken?: string;
  driveFolderId?: string;
}

// Parse JSON body from IncomingMessage
async function parseBody(req: IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const {
      pdfBase64,
      adminEmail,
      clientEmail,
      clientName = 'Signataire',
      docTitle = 'Document',
      companyName = 'AutoCompt',
      token,
      driveAccessToken,
      driveFolderId,
    } = await parseBody(req);

    const resendApiKey = process.env.RESEND_API_KEY;
    // Canonical app URL — used in email links and footers
    const appUrl = process.env.VITE_APP_URL || 'https://autocompt.ca';

    // ─── Resend "from" domain — deliverability notes ──────────────────────────
    // onboarding@resend.dev = Resend's shared sandbox domain. Works for Gmail &
    // verified Resend emails but IS BLOCKED by Hotmail/Outlook because Microsoft
    // rejects emails from shared developer domains via strict DMARC enforcement.
    //
    // FIX FOR PRODUCTION (required before Beta launch to Hotmail/Outlook users):
    //   1. Buy or use existing domain: e.g. autocompt.ca
    //   2. In Resend dashboard → Domains → Add domain → add SPF/DKIM/DMARC DNS records
    //   3. Set Vercel env var: RESEND_FROM_EMAIL=DocuLegal <doculegal@autocompt.ca>
    //
    // Until then: emails to Gmail ✅ | Hotmail/Outlook ⚠️ (likely blocked)
    // ─────────────────────────────────────────────────────────────────────────
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DocuLegal AutoCompt <doculegal@autocompt.ca>';
    const replyToEmail = 'info@autocompt.ca'; // Central inbox — all replies land here
    const results: Record<string, any> = { emailAdmin: false, emailClient: false, driveUpload: false };


    const safeTitle = (docTitle).replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    const dateStr = new Date().toLocaleDateString('fr-CA');

    const emailHtml = (recipientType: 'admin' | 'client') => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:20px 0">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)">
          <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:36px 40px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">✦</div>
              <div>
                <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase">DocuLegal · AutoCompt</div>
              </div>
            </div>
            <div style="color:#ffffff;font-size:24px;font-weight:900;margin-top:16px;line-height:1.2">✅ Document Signé</div>
            <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px">
              ${recipientType === 'admin'
        ? `<strong>${clientName}</strong> a signé le document le <strong>${dateStr}</strong>.`
        : `Votre signature a été enregistrée le <strong>${dateStr}</strong>.`}
            </div>
          </div>

          <div style="padding:36px 40px">
            <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:16px;padding:20px 24px;margin-bottom:24px">
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px">Document signé</div>
              <div style="font-size:17px;font-weight:900;color:#111827;line-height:1.3">${docTitle}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px;font-weight:500">${companyName}</div>
            </div>

            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
              📎 <strong>Le PDF certifié bipartite est joint à cet email.</strong><br>
              Il contient les deux signatures électroniques avec les métadonnées légales (nom, date, heure, token d'audit).
            </p>

            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px">
              <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🔒 Certificat d'authenticité</div>
              <code style="font-size:10px;color:#6b7280;font-family:'Courier New',monospace;word-break:break-all">
                Token: ${(token || 'N/A').toUpperCase()}<br>
                Certifié via DocuLegal (AutoCompt) · LCCJTI Québec<br>
                Date: ${new Date().toISOString()}
              </code>
            </div>
          </div>

          <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="color:#9ca3af;font-size:11px;margin:0;line-height:1.6">
              Document numérique certifié · DocuLegal by AutoCompt Canada<br>
              <a href="${appUrl}" style="color:#059669;text-decoration:none;font-weight:600">${appUrl.replace('https://', '')}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ── 1. Send emails via Resend REST API ──
    if (resendApiKey && pdfBase64) {
      const attachment = {
        filename: `DocuLegal_${safeTitle.replace(/\s+/g, '_')}_Signé.pdf`,
        content: pdfBase64,
      };

      // Email to Admin
      if (adminEmail) {
        try {
          const adminResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [adminEmail],
              reply_to: replyToEmail,          // Replies land in central info@ inbox
              subject: `✅ Signé: ${docTitle} — ${clientName}`,
              html: emailHtml('admin'),
              attachments: [attachment],
            }),
          });
          results.emailAdmin = adminResp.ok;
          if (!adminResp.ok) {
            const errBody = await adminResp.json().catch(() => ({})) as any;
            results.emailAdminError = errBody?.message || 'Unknown error';
            console.error('[Resend] Admin email error:', errBody);
          }
        } catch (err) {
          results.emailAdminError = String(err);
          console.error('[Resend] Admin email failed:', err);
        }
      } else {
        results.emailAdmin = 'skipped_no_admin_email';
      }

      // Email to Client
      if (clientEmail) {
        try {
          const clientResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [clientEmail],
              reply_to: replyToEmail,          // Client replies go to info@ central inbox
              subject: `📄 Votre copie signée: ${docTitle}`,
              html: emailHtml('client'),
              attachments: [attachment],
            }),
          });
          results.emailClient = clientResp.ok;
        } catch (err) {
          results.emailClientError = String(err);
        }
      }
    } else if (!resendApiKey) {
      console.log('[DocuLegal] RESEND_API_KEY not set — email skipped');
      results.emailAdmin = 'skipped_no_api_key';
    } else if (!pdfBase64) {
      results.emailAdmin = 'skipped_no_pdf';
    }

    // ── 2. Google Drive Upload (Phase 2 — activates when company OAuth configured) ──
    if (driveAccessToken && driveFolderId && pdfBase64) {
      try {
        const boundary = 'autocompt_doculegal_boundary';
        const metadata = JSON.stringify({
          name: `DocuLegal_${safeTitle}_${dateStr.replace(/\//g, '-')}.pdf`,
          parents: [driveFolderId],
          mimeType: 'application/pdf',
        });

        const multipartBody = [
          `--${boundary}`,
          'Content-Type: application/json; charset=UTF-8',
          '',
          metadata,
          `--${boundary}`,
          'Content-Type: application/pdf',
          'Content-Transfer-Encoding: base64',
          '',
          pdfBase64,
          `--${boundary}--`,
        ].join('\r\n');

        const driveResp = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${driveAccessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );

        if (driveResp.ok) {
          const driveFile = await driveResp.json() as { id?: string };
          results.driveUpload = true;
          results.driveFileId = driveFile.id;
        } else {
          results.driveUpload = false;
          results.driveError = await driveResp.text();
        }
      } catch (driveErr) {
        results.driveUpload = false;
        results.driveError = String(driveErr);
      }
    } else {
      results.driveUpload = 'pending_oauth_setup';
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, results }));

  } catch (error: any) {
    console.error('[save-signed-document] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error?.message || 'Internal error' }));
  }
}
