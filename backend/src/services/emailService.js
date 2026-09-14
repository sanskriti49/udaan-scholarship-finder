import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import NotificationLog from "../models/NotificationLog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target candidate paths for logo.png (checks your exact frontend structure)
const CANDIDATE_PATHS = [
	"C:\\Users\\sansk\\Downloads\\udaan-scholarship-finder\\frontend\\src\\assets\\images\\logo.png",
	path.resolve(__dirname, "../../frontend/src/assets/images/logo.png"),
	path.resolve(__dirname, "../../../frontend/src/assets/images/logo.png"),
	path.resolve(process.cwd(), "frontend/src/assets/images/logo.png"),
	path.resolve(process.cwd(), "../frontend/src/assets/images/logo.png"),
	process.env.LOGO_PATH,
].filter(Boolean);

const RESOLVED_LOGO_PATH =
	CANDIDATE_PATHS.find((p) => fs.existsSync(p)) || null;

if (RESOLVED_LOGO_PATH) {
	console.log(`[EmailService] Logo found: ${RESOLVED_LOGO_PATH}`);
} else {
	console.warn(
		"[EmailService] Logo file not found. Ensure path to frontend logo.png is valid.",
	);
}

class EmailService {
	constructor() {
		this.transporter = null;
		this.isConfigured = false;
		this.init();
	}

	init() {
		const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

		if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
			try {
				const port = parseInt(SMTP_PORT, 10) || 587;
				this.transporter = nodemailer.createTransport({
					host: SMTP_HOST,
					port,
					secure: port === 465,
					auth: {
						user: SMTP_USER,
						pass: SMTP_PASS,
					},
				});
				this.isConfigured = true;
				console.log(
					`[EmailService] Production SMTP transporter initialized (${SMTP_HOST}:${port}).`,
				);
			} catch (err) {
				console.error(
					"[EmailService] Failed initializing SMTP transport:",
					err.message,
				);
				this.transporter = null;
				this.isConfigured = false;
			}
		} else {
			console.log(
				"[EmailService] Running in simulated mode (logs to database).",
			);
		}
	}

	async verifyConnection() {
		if (!this.isConfigured && process.env.SMTP_HOST) {
			this.init();
		}
		if (!this.transporter) return false;
		try {
			await this.transporter.verify();
			console.log("[EmailService] SMTP connection verified successfully.");
			return true;
		} catch (err) {
			console.error(
				"[EmailService] SMTP connection verification failed:",
				err.message,
			);
			return false;
		}
	}

	getBaseLayout(contentHtml, preheader = "Udaan Scholarship Intelligence") {
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
		const logoSrc =
			process.env.EMAIL_LOGO_URL ||
			(RESOLVED_LOGO_PATH ? "cid:udaanLogo" : `${frontendUrl}/logo.png`);

		return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Udaan Notification</title>
  <!-- Clash Display from official Fontshare CDN -->
  <link href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap" rel="stylesheet">
  <style>
    @import url('https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap');

    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #FAF8F5; 
      color: #081C10; 
    }
    .wrapper { 
      max-width: 600px; 
      margin: 24px auto; 
      background-color: #FFFFFF; 
      border: 1px solid #E2E8F0; 
      border-radius: 16px; 
      overflow: hidden; 
    }
    .header { 
      background-color: #081C10; 
      padding: 24px 32px; 
      text-align: left; 
    }
    .brand-title { 
      font-family: 'Clash Display', 'ClashDisplay-Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 25px; 
      font-weight: 600; 
      letter-spacing: -0.5px; 
      color: #FFFFFF; 
      margin: 0; 
      line-height: 1.05; 
    }
    .brand-subtitle { 
      color: #74C69D; 
      font-size: 11px; 
      font-weight: 600; 
      letter-spacing: 0.6px; 
      text-transform: uppercase;
      margin-top: 3px; 
      line-height: 1.2; 
    }
    .body-content { padding: 32px; }
    .badge { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 9999px; 
      font-size: 11px; 
      font-weight: 700; 
      letter-spacing: 0.5px; 
      text-transform: uppercase; 
    }
    .badge-emerald { background-color: #EDF7F0; color: #1B432A; border: 1px solid #B7E4C7; }
    .badge-amber { background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .badge-rose { background-color: #FFE4E6; color: #9F1239; border: 1px solid #FECDD3; }
    .cta-button { 
      display: inline-block; 
      background-color: #081C10; 
      color: #FFFFFF !important; 
      font-size: 14px; 
      font-weight: 600; 
      text-decoration: none; 
      padding: 12px 28px; 
      border-radius: 12px; 
      margin-top: 20px; 
    }
    .footer { 
      background-color: #F8FAFC; 
      border-top: 1px solid #E2E8F0; 
      padding: 20px 32px; 
      font-size: 12px; 
      color: #64748B; 
      text-align: center; 
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    /* Prevents Outlook desktop from defaulting to Times New Roman */
    .brand-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important; font-weight: 700 !important; }
  </style>
  <![endif]-->
</head>
<body>
  <div style="display:none;font-size:1px;color:#FAF8F5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <a href="${frontendUrl}" style="text-decoration: none; display: inline-block;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td valign="middle" style="padding-right: 12px; vertical-align: middle;">
                    <img 
                      src="${logoSrc}" 
                      alt="Udaan" 
                      width="40" 
                      height="40" 
                      style="display: block; width: 40px; height: 40px; border: 0; outline: none; text-decoration: none; object-fit: contain;" 
                    />
                  </td>
                  <td valign="middle" style="vertical-align: middle;">
                    <div class="brand-title">udaan</div>
                    <div class="brand-subtitle">Scholarship Intelligence</div>
                  </td>
                </tr>
              </table>
            </a>
          </div>
          <div class="body-content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">You are receiving this update based on your notification preferences in Udaan.</p>
            <p style="margin: 0;"><a href="${frontendUrl}/settings" style="color: #2D6A4F; text-decoration: underline;">Manage Notification Preferences</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	formatAmount(amount) {
		if (!amount) return "Tuition and Grant";
		const numeric =
			typeof amount === "number"
				? amount
				: Number(String(amount).replace(/[^0-9.-]+/g, ""));
		return !isNaN(numeric) && numeric > 0
			? `₹${numeric.toLocaleString("en-IN")}`
			: String(amount);
	}

	renderTemplate(type, data) {
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

		switch (type) {
			case "INSTANT_MATCH": {
				const matchScore = data.evidence?.matchScore || 85;
				const amount = this.formatAmount(data.amount);
				const deadlineStr = data.deadline
					? new Date(data.deadline).toLocaleDateString("en-IN", {
							day: "numeric",
							month: "short",
							year: "numeric",
						})
					: "Open Application";
				const passedRules = data.evidence?.passedRulesSummary || [];

				const contentHtml = `
          <div style="margin-bottom: 16px;">
            <span class="badge badge-emerald">${matchScore}% Match Found</span>
          </div>
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">${data.scholarshipTitle || data.title}</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            A newly discovered scholarship matches your profile with high confidence. Here is why this opportunity was selected for you:
          </p>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: #081C10; margin-bottom: 8px;">Opportunity Highlights</div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Grant Amount:</strong> ${amount}</div>
            <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Deadline:</strong> ${deadlineStr}</div>
            ${data.evidence?.state ? `<div style="font-size: 13px; color: #334155;"><strong>Region / Domicile:</strong> ${data.evidence.state}</div>` : ""}
          </div>
          ${
						passedRules.length > 0
							? `
            <div style="margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; color: #081C10; margin-bottom: 8px;">Verified Eligibility Criteria</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
                ${passedRules
									.slice(0, 4)
									.map((r) => `<li>${r}</li>`)
									.join("")}
              </ul>
            </div>
          `
							: ""
					}
          <a href="${frontendUrl}${data.link || "/scholarships"}" class="cta-button">View Scheme Details & Apply</a>
        `;
				return {
					subject: `[High Match] ${matchScore}% Match: ${data.scholarshipTitle || "New Scholarship Opportunity"}`,
					html: this.getBaseLayout(
						contentHtml,
						`${matchScore}% eligibility match found on Udaan`,
					),
				};
			}

			case "DEADLINE_7_DAYS":
			case "DEADLINE_48_HOURS": {
				const isUrgent = type === "DEADLINE_48_HOURS";
				const daysLeft = isUrgent ? "48 Hours" : "7 Days";
				const badgeClass = isUrgent ? "badge-rose" : "badge-amber";
				const deadlineStr = data.deadline
					? new Date(data.deadline).toLocaleDateString("en-IN", {
							day: "numeric",
							month: "short",
							year: "numeric",
						})
					: "Closing Soon";

				const contentHtml = `
          <div style="margin-bottom: 16px;">
            <span class="badge ${badgeClass}">Application Closes in ${daysLeft}</span>
          </div>
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">${data.scholarshipTitle || data.title}</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            This is an automated reminder that the official portal deadline for this scholarship is arriving on <strong>${deadlineStr}</strong>.
          </p>
          <div style="background-color: ${isUrgent ? "#FFF1F2" : "#FFFBEB"}; border: 1px solid ${isUrgent ? "#FECDD3" : "#FDE68A"}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 13px; color: ${isUrgent ? "#9F1239" : "#92400E"}; font-weight: 600;">
              Please make sure your certificates and institutional verification documents are uploaded before the cutoff window.
            </div>
          </div>
          <a href="${frontendUrl}${data.link || "/scholarships"}" class="cta-button">Submit Application on Official Portal</a>
        `;
				return {
					subject: `[Reminder] ${daysLeft} Left to Apply: ${data.scholarshipTitle || "Scholarship Deadline"}`,
					html: this.getBaseLayout(
						contentHtml,
						`Deadline reminder: ${daysLeft} remaining to submit application`,
					),
				};
			}

			case "STATE_GRANT_UPDATE": {
				const stateName = data.evidence?.state || "State";
				const contentHtml = `
          <div style="margin-bottom: 16px;">
            <span class="badge badge-emerald">New Regional Grant: ${stateName}</span>
          </div>
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">${data.scholarshipTitle || data.title}</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            A new state-specific scholarship notification was recently ingested from official portals matching your registered domicile in <strong>${stateName}</strong>.
          </p>
          <a href="${frontendUrl}${data.link || "/scholarships"}" class="cta-button">Review State Scheme Guidelines</a>
        `;
				return {
					subject: `[State Grant] New Opportunity for ${stateName} Students: ${data.scholarshipTitle || data.title}`,
					html: this.getBaseLayout(
						contentHtml,
						`New state scholarship circular published for ${stateName}`,
					),
				};
			}

			case "WEEKLY_DIGEST": {
				const items = Array.isArray(data.data?.topScholarships)
					? data.data.topScholarships
					: [];
				const contentHtml = `
          <div style="margin-bottom: 16px;">
            <span class="badge badge-emerald">Monday Scholarship Digest</span>
          </div>
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">Your Curated Weekly Opportunities</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Here are your top personalized scholarship matches currently accepting applications this week:
          </p>
          ${items
						.map(
							(item) => `
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
              <div style="font-size: 14px; font-weight: 700; color: #081C10; margin-bottom: 4px;">${item.title}</div>
              <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">${item.organization}</div>
              <div style="font-size: 12px; color: #2D6A4F; font-weight: 600;">
                ${this.formatAmount(item.amount)} &bull; Deadline: ${item.deadline ? new Date(item.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Ongoing"}
              </div>
            </div>
          `,
						)
						.join("")}
          <a href="${frontendUrl}/scholarships" class="cta-button">Browse All Matching Schemes</a>
        `;
				return {
					subject:
						"Your Weekly Udaan Scholarship Digest: Fresh Matches for Monday",
					html: this.getBaseLayout(
						contentHtml,
						"Your curated scholarship digest for this week",
					),
				};
			}

			default: {
				const contentHtml = `
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">${data.title}</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">${data.message}</p>
          <a href="${frontendUrl}${data.link || "/"}" class="cta-button">Open Udaan Dashboard</a>
        `;
				return {
					subject: data.title || "Udaan Notification",
					html: this.getBaseLayout(contentHtml, data.title),
				};
			}
		}
	}

	async sendEmail({ to, type, data, notificationId, userId }) {
		if (!this.isConfigured && process.env.SMTP_HOST && process.env.SMTP_USER) {
			this.init();
		}

		const { subject, html } = this.renderTemplate(type, data);
		const fromAddress =
			process.env.EMAIL_FROM ||
			process.env.SMTP_USER ||
			'"Udaan Scholarship Finder" <notifications@udaan.edu>';

		// Attach logo via CID if valid local file exists and no remote CDN URL is set
		const attachments = [];
		if (!process.env.EMAIL_LOGO_URL && RESOLVED_LOGO_PATH) {
			attachments.push({
				filename: "logo.png",
				path: RESOLVED_LOGO_PATH,
				cid: "udaanLogo",
			});
		}

		let attempt = 1;
		const maxAttempts = 2;
		let lastError = null;

		while (attempt <= maxAttempts) {
			try {
				if (this.isConfigured && this.transporter) {
					const info = await this.transporter.sendMail({
						from: fromAddress,
						to,
						subject,
						html,
						attachments,
					});

					try {
						await NotificationLog.create({
							notification: notificationId,
							user: userId,
							channel: "email",
							status: "SUCCESS",
							recipient: to,
							subject,
							attempt,
							messageId: info.messageId,
						});
					} catch (logErr) {}

					return { success: true, messageId: info.messageId };
				} else {
					const mockMessageId = `mock-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
					console.log(
						`[EmailService (Simulated)] Dispatched '${subject}' to <${to}> [ID: ${mockMessageId}]`,
					);

					try {
						await NotificationLog.create({
							notification: notificationId,
							user: userId,
							channel: "email",
							status: "SUCCESS",
							recipient: to,
							subject,
							attempt,
							messageId: mockMessageId,
							metadata: { note: "Simulated email in development mode" },
						});
					} catch (logErr) {}

					return { success: true, messageId: mockMessageId };
				}
			} catch (err) {
				lastError = err;
				console.error(
					`[EmailService] Attempt ${attempt} failed sending to ${to}:`,
					err.message,
				);
				attempt++;
				if (attempt <= maxAttempts) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		}

		await NotificationLog.create({
			notification: notificationId,
			user: userId,
			channel: "email",
			status: "FAILED",
			recipient: to,
			subject,
			attempt: maxAttempts,
			error: lastError?.message || "Unknown error",
		});

		return { success: false, error: lastError?.message };
	}
}

export const emailService = new EmailService();
export default emailService;
