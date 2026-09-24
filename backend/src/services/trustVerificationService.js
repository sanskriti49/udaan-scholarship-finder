import mongoose from "mongoose";
import Scholarship from "../models/Scholarship.js";

// Official domain suffixes and whitelists
const OFFICIAL_GOV_DOMAINS = [
  "gov.in",
  "nic.in",
  "ac.in",
  "edu.in",
  "ugc.ac.in",
  "aicte-india.org",
  "dst.gov.in",
  "dbtindia.gov.in",
  "mhrd.gov.in",
  "scholarships.gov.in",
];

const VERIFIED_CSR_DOMAINS = [
  "tatatrusts.org",
  "reliancefoundation.org",
  "azimpremjifoundation.org",
  "buddy4study.com",
  "drreddysfoundation.org",
  "infosys.org",
  "adityabirla.com",
  "hdfcbank.com",
  "vidyasaarathi.co.in",
  "ongcindia.com",
  "coalindia.in",
];

const SUSPICIOUS_TLDS = [
  ".xyz",
  ".top",
  ".online",
  ".site",
  ".club",
  ".buzz",
  ".work",
  ".space",
  ".click",
  ".link",
  ".tk",
  ".ml",
  ".ga",
  ".cf",
  ".gq",
];

const FREE_HOSTING_PATTERNS = [
  "blogspot.com",
  "wordpress.com",
  "wixsite.com",
  "weebly.com",
  "sites.google.com",
  "forms.gle",
  "docs.google.com/forms",
];

const OFFICIAL_REGISTRY = [
  {
    name: "National Scholarship Portal (NSP)",
    authority: "Ministry of Electronics & Information Technology / MoE",
    domain: "scholarships.gov.in",
    url: "https://scholarships.gov.in",
    type: "Central Government",
    sslVerified: true,
    description: "Centralized one-stop portal for Central Sector and Ministry schemes.",
  },
  {
    name: "AICTE Pragati & Saksham Portal",
    authority: "All India Council for Technical Education",
    domain: "aicte-india.org",
    url: "https://www.aicte-india.org",
    type: "Technical Education Regulatory Body",
    sslVerified: true,
    description: "Technical education grants for girls, differently-abled, and swanath students.",
  },
  {
    name: "UGC e-Scholarship Portal",
    authority: "University Grants Commission",
    domain: "ugc.ac.in",
    url: "https://www.ugc.gov.in",
    type: "Higher Education Regulatory Body",
    sslVerified: true,
    description: "National fellowships for single girl child, PG rank holders, and minorities.",
  },
  {
    name: "MahaDBT Aaple Sarkar",
    authority: "Government of Maharashtra",
    domain: "mahadbt.maharashtra.gov.in",
    url: "https://mahadbt.maharashtra.gov.in",
    type: "State DBT Portal",
    sslVerified: true,
    description: "Post-matric scholarship and tuition fee reimbursement portal for Maharashtra.",
  },
  {
    name: "State Scholarship Portal (SSP Karnataka)",
    authority: "Government of Karnataka / Centre for e-Governance",
    domain: "ssp.postmatric.karnataka.gov.in",
    url: "https://ssp.postmatric.karnataka.gov.in",
    type: "State DBT Portal",
    sslVerified: true,
    description: "Direct Benefit Transfer portal for all post-matric students in Karnataka.",
  },
  {
    name: "UP Scholarship & Fee Reimbursement",
    authority: "Government of Uttar Pradesh",
    domain: "scholarship.up.gov.in",
    url: "https://scholarship.up.gov.in",
    type: "State DBT Portal",
    sslVerified: true,
    description: "Dashmottar scholarship and fee refund system for UP domicile students.",
  },
  {
    name: "Medhashree & Oasis Portal (West Bengal)",
    authority: "Government of West Bengal",
    domain: "oasis.gov.in",
    url: "https://oasis.gov.in",
    type: "State DBT Portal",
    sslVerified: true,
    description: "OBC, SC, and ST scholarship disbursement portal for West Bengal.",
  },
  {
    name: "Tata Trusts Educational Grants",
    authority: "Tata Trusts Philanthropy",
    domain: "tatatrusts.org",
    url: "https://www.tatatrusts.org",
    type: "Philanthropic Foundation",
    sslVerified: true,
    description: "Merit and travel grants for higher studies in India and abroad.",
  },
  {
    name: "Reliance Foundation Undergraduate Scholarships",
    authority: "Reliance Foundation",
    domain: "reliancefoundation.org",
    url: "https://www.reliancefoundation.org",
    type: "Corporate CSR",
    sslVerified: true,
    description: "Undergraduate STEM and general scholarships across India.",
  },
];

export class TrustVerificationService {
  /**
   * Analyze an input URL or forwarded text for safety and scam indicators
   */
  async analyzeLinkOrText({ url = "", text = "" }) {
    const rawInput = (url || text || "").trim();
    const findings = [];
    let score = 70; // baseline neutral score
    let verdict = "UNVERIFIED_THIRD_PARTY";
    let matchedOfficial = null;
    let crossReferencedScheme = null;

    let parsedUrl = null;
    try {
      if (url) {
        let testUrl = url;
        if (!testUrl.startsWith("http://") && !testUrl.startsWith("https://")) {
          testUrl = "https://" + testUrl;
        }
        parsedUrl = new URL(testUrl);
      }
    } catch {
      // Not a valid URL, treat as text
    }

    // 1. Domain Heuristics Check
    if (parsedUrl) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isHttps = parsedUrl.protocol === "https:";

      if (!isHttps) {
        score -= 20;
        findings.push({
          severity: "high",
          type: "INSECURE_PROTOCOL",
          title: "Insecure Connection (HTTP)",
          description: "This portal does not use SSL/HTTPS encryption. Never enter personal credentials or bank details.",
        });
      }

      // Check Government Domain
      const isGov = OFFICIAL_GOV_DOMAINS.some(
        (gov) => hostname === gov || hostname.endsWith("." + gov)
      );

      // Check Verified CSR Domain
      const isCsr = VERIFIED_CSR_DOMAINS.some(
        (csr) => hostname === csr || hostname.endsWith("." + csr)
      );

      // Check Suspicious TLDs
      const isSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => hostname.endsWith(tld));

      // Check Free Hosting Sites
      const isFreeHost = FREE_HOSTING_PATTERNS.some((fh) => hostname.includes(fh));

      if (isGov) {
        score = 98;
        verdict = "VERIFIED_OFFICIAL";
        findings.push({
          severity: "positive",
          type: "GOV_DOMAIN_VERIFIED",
          title: "Statutory Government Domain (.gov.in / .nic.in)",
          description: "This domain is restricted and strictly issued to sovereign Indian government ministries or educational bodies.",
        });

        matchedOfficial = OFFICIAL_REGISTRY.find((reg) => hostname.includes(reg.domain)) || {
          name: "Official Government Portal",
          authority: "State / Central Government of India",
          domain: hostname,
          url: parsedUrl.origin,
          type: "Official Government",
        };
      } else if (isCsr) {
        score = 88;
        verdict = "VERIFIED_CSR";
        findings.push({
          severity: "positive",
          type: "VERIFIED_CSR",
          title: "Recognized Corporate / Philanthropic CSR",
          description: "This domain belongs to a verified institutional philanthropy or established Indian scholarship foundation.",
        });
      } else if (isSuspiciousTld) {
        score -= 40;
        findings.push({
          severity: "critical",
          type: "SUSPICIOUS_TLD",
          title: "High-Risk Domain Extension (" + hostname.slice(hostname.lastIndexOf(".")) + ")",
          description: "This domain uses a low-cost or anonymous top-level domain frequently used in phishing campaigns.",
        });
      }

      if (isFreeHost) {
        score -= 35;
        findings.push({
          severity: "critical",
          type: "FREE_HOSTING_SERVICE",
          title: "Unverified Free Hosting Platform",
          description: "Official government scholarships never host application forms on Google Forms, Blogspot, or free website builders.",
        });
      }
    }

    // 2. Pattern Matching Heuristics (Fee Demands, Scams, WhatsApp forwards)
    const combinedContent = (rawInput + " " + (parsedUrl ? parsedUrl.pathname + parsedUrl.search : "")).toLowerCase();

    // Red Flag 1: Application Fee Requests
    const feePatterns = [
      /registration fee/i,
      /application fee/i,
      /processing charge/i,
      /processing fee/i,
      /pay ₹[0-9]+/i,
      /fee of ₹[0-9]+/i,
      /deposit ₹[0-9]+/i,
      /pay rs.?s*[0-9]+/i,
      /refundable charge/i,
    ];

    const hasFee = feePatterns.some((pattern) => pattern.test(combinedContent));
    if (hasFee) {
      score -= 50;
      findings.push({
        severity: "critical",
        type: "FEE_EXTORTION_DETECTED",
        title: "Application Fee Request Detected",
        description: "By statutory regulation, Indian government scholarships are 100% free to apply. Legitimate private CSRs also never demand processing fees.",
      });
    }

    // Red Flag 2: UPI Handles Detected
    const upiRegex = /[a-zA-Z0-9._-]+@(upi|okaxis|okhdfcbank|oksbi|paytm|ybl|axl|ibl)/i;
    if (upiRegex.test(combinedContent)) {
      score -= 45;
      findings.push({
        severity: "critical",
        type: "PERSONAL_UPI_DETECTED",
        title: "Personal UPI Payment Handle Found",
        description: "Official scholarships disburse funds directly through DBT/PFMS. They never ask students to transfer money via UPI.",
      });
    }

    // Red Flag 3: Fake Direct Payout Promises
    const fakePromises = [
      "100% selection guaranteed",
      "direct bank transfer without exam",
      "send aadhaar on whatsapp",
      "send documents on whatsapp",
      "instant scholarship approval",
    ];

    const hasFakePromise = fakePromises.some((fp) => combinedContent.includes(fp));
    if (hasFakePromise) {
      score -= 30;
      findings.push({
        severity: "high",
        type: "MISLEADING_GUARANTEE",
        title: "Unrealistic Guarantee / WhatsApp Phishing Pattern",
        description: "Legitimate scholarships require institutional verification and nodal officer review. Promising direct payouts without scrutiny is a hallmark of fraud.",
      });
    }

    // Red Flag 4: Unofficial Email Addresses
    const unofficialEmail = combinedContent.match(/[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook).com/i);
    if (unofficialEmail && combinedContent.includes("ministry")) {
      score -= 25;
      findings.push({
        severity: "high",
        type: "UNOFFICIAL_EMAIL",
        title: "Commercial Email Claiming Ministry Affiliation",
        description: "Government officials communicate via @gov.in or @nic.in email addresses, never personal Gmail or Yahoo IDs.",
      });
    }

    // 3. Database Cross-Reference (MongoDB Scheme Check)
    try {
      const cleaned = rawInput
        .replace(/https?:\/\/[^\s]+/gi, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim();
      const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 4);

      if (tokens.length > 0) {
        // Pick the most distinctive token (longest keyword) to avoid matching trivial words
        const primaryToken = tokens.sort((a, b) => b.length - a.length)[0];
        const safeToken = primaryToken.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        const tokenRegex = new RegExp(`\\b${safeToken}`, "i");

        const query = {
          $or: [
            { title: tokenRegex },
            { organization: tokenRegex },
          ],
        };
        if (mongoose.connection.readyState === 1) {
          const dbMatch = await Scholarship.findOne(query).select(
            "title organization sourceSite sourceUrl amount deadline"
          ).lean();

          if (dbMatch) {
            crossReferencedScheme = {
              id: dbMatch._id,
              title: dbMatch.title,
              organization: dbMatch.organization,
              officialPortal: dbMatch.sourceUrl,
              deadline: dbMatch.deadline,
            };
            findings.push({
              severity: "positive",
              type: "DB_RECORD_MATCH",
              title: "Verified Registry Match Found",
              description: "Matches a verified scholarship record in Udaan's official database: '" + dbMatch.title + "'.",
            });
            score = Math.max(score, 85);
          }
        }
      }
    } catch {
      // Mongo query failure or offline fallback
    }

    // Normalize final score and verdict
    score = Math.max(5, Math.min(100, score));

    if (score >= 90) {
      verdict = "VERIFIED_OFFICIAL";
    } else if (score >= 80) {
      verdict = "VERIFIED_CSR";
    } else if (score >= 50) {
      verdict = "UNVERIFIED_THIRD_PARTY";
    } else {
      verdict = "HIGH_RISK_SUSPICIOUS";
    }

    return {
      input: rawInput,
      domain: parsedUrl ? parsedUrl.hostname : null,
      score,
      verdict,
      matchedOfficial,
      crossReferencedScheme,
      findings,
      zeroFeeGuaranteed: true,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Return verified official directory
   */
  getOfficialDirectory() {
    return OFFICIAL_REGISTRY;
  }
}

export const trustVerificationService = new TrustVerificationService();
