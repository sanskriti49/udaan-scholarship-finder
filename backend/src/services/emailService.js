import nodemailer from "nodemailer";
import NotificationLog from "../models/NotificationLog.js";

/**
 * Email Service
 * Handles transactional, branded email notifications for Udaan students.
 * Supports production SMTP transport with graceful dev fallback and full audit logging.
 */
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
				this.transporter = nodemailer.createTransport({
					host: SMTP_HOST,
					port: parseInt(SMTP_PORT, 10) || 587,
					secure: parseInt(SMTP_PORT, 10) === 465,
					auth: {
						user: SMTP_USER,
						pass: SMTP_PASS,
					},
				});
				this.isConfigured = true;
				console.log("[EmailService] Production SMTP transporter initialized.");
			} catch (err) {
				console.error("[EmailService] Failed initializing SMTP transport:", err.message);
				this.transporter = null;
				this.isConfigured = false;
			}
		} else {
			console.log("[EmailService] SMTP credentials not detected. Running in simulated fallback mode (logs to DB).");
		}
	}

	getBaseLayout(contentHtml, preheader = "Udaan Scholarship Intelligence") {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Udaan Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FAF8F5; color: #081C10; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background-color: #081C10; padding: 24px 32px; text-align: left; }
    .brand-title { color: #FFFFFF; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }
    .brand-subtitle { color: #74C69D; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .body-content { padding: 32px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-emerald { background-color: #EDF7F0; color: #1B432A; border: 1px solid #B7E4C7; }
    .badge-amber { background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .badge-rose { background-color: #FFE4E6; color: #9F1239; border: 1px solid #FECDD3; }
    .cta-button { display: inline-block; background-color: #081C10; color: #FFFFFF !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; margin-top: 20px; }
    .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 12px; color: #64748B; text-align: center; }
  </style>
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
            <h1 class="brand-title">udaan</h1>
            <div class="brand-subtitle">Scholarship Intelligence</div>
          </div>
          <div class="body-content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">You are receiving this update based on your notification preferences in Udaan.</p>
            <p style="margin: 0;"><a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/settings" style="color: #2D6A4F; text-decoration: underline;">Manage Notification Preferences</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
	}

	renderTemplate(type, data) {
		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

		switch (type) {
			case "INSTANT_MATCH": {
				const matchScore = data.evidence?.matchScore || 85;
				const amount = data.amount ? `Rs. ${Number(data.amount).toLocaleString("en-IN")}` : "Tuition and Grant";
				const deadlineStr = data.deadline ? new Date(data.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Open";
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

          ${passedRules.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; color: #081C10; margin-bottom: 8px;">Verified Eligibility Criteria</div>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
                ${passedRules.slice(0, 4).map((r) => `<li>${r}</li>`).join("")}
              </ul>
            </div>
          ` : ""}

          <a href="${frontendUrl}${data.link || "/scholarships"}" class="cta-button">View Scheme Details & Apply</a>
        `;
				return {
					subject: `[High Match] ${matchScore}% Match: ${data.scholarshipTitle || "New Scholarship Opportunity"}`,
					html: this.getBaseLayout(contentHtml, `${matchScore}% eligibility match found on Udaan`),
				};
			}

			case "DEADLINE_7_DAYS":
			case "DEADLINE_48_HOURS": {
				const isUrgent = type === "DEADLINE_48_HOURS";
				const daysLeft = isUrgent ? "48 Hours" : "7 Days";
				const badgeClass = isUrgent ? "badge-rose" : "badge-amber";
				const deadlineStr = data.deadline ? new Date(data.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Closing Soon";

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
					html: this.getBaseLayout(contentHtml, `Deadline reminder: ${daysLeft} remaining to submit application`),
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
					html: this.getBaseLayout(contentHtml, `New state scholarship circular published for ${stateName}`),
				};
			}

			case "WEEKLY_DIGEST": {
				const items = Array.isArray(data.data?.topScholarships) ? data.data.topScholarships : [];
				const contentHtml = `
          <div style="margin-bottom: 16px;">
            <span class="badge badge-emerald">Monday Scholarship Digest</span>
          </div>
          <h2 style="font-size: 20px; color: #081C10; margin: 0 0 8px 0;">Your Curated Weekly Opportunities</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
            Here are your top personalized scholarship matches currently accepting applications this week:
          </p>

          ${items.map((item) => `
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
              <div style="font-size: 14px; font-weight: 700; color: #081C10; margin-bottom: 4px;">${item.title}</div>
              <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">${item.organization}</div>
              <div style="font-size: 12px; color: #2D6A4F; font-weight: 600;">
                ${item.amount ? `Rs. ${Number(item.amount).toLocaleString("en-IN")}` : "Grant"} &bull; Deadline: ${item.deadline ? new Date(item.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Ongoing"}
              </div>
            </div>
          `).join("")}

          <a href="${frontendUrl}/scholarships" class="cta-button">Browse All Matching Schemes</a>
        `;
				return {
					subject: "Your Weekly Udaan Scholarship Digest: Fresh Matches for Monday",
					html: this.getBaseLayout(contentHtml, "Your curated scholarship digest for this week"),
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
		const { subject, html } = this.renderTemplate(type, data);
		const fromAddress = process.env.EMAIL_FROM || '"Udaan Scholarship Finder" <notifications@udaan.edu>';

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
					});

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

					return { success: true, messageId: info.messageId };
				} else {
					// Simulated dispatch for development
					const mockMessageId = `mock-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
					console.log(`[EmailService (Simulated)] Dispatched '${subject}' to <${to}> [ID: ${mockMessageId}]`);

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

					return { success: true, messageId: mockMessageId };
				}
			} catch (err) {
				lastError = err;
				console.error(`[EmailService] Attempt ${attempt} failed sending to ${to}:`, err.message);
				attempt++;
				if (attempt <= maxAttempts) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		}

		// Permanent Failure Log
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
