import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Security: Enforce JSON request payload size limit to prevent memory exhaustion / DoS
app.use(express.json({ limit: "10kb" }));

// Security: HTTP Security Headers Middleware (OWASP recommended)
app.use((req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Protect against Clickjacking (Allow iframe rendering for local preview if needed)
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  
  // Cross-Site Scripting protection for legacy browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Limit referrer information leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Restrict browser features and APIs
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  
  // Content Security Policy (allows self, inline scripts, counter.dev analytics, fonts, images)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.counter.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: ws: wss: https://cdn.counter.dev https://counter.dev;"
  );

  // Enforce HTTPS HSTS when served over secure protocol
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

// Security: In-Memory Sliding Window Rate Limiter for API endpoints
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute per IP

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();

  const timestamps = rateLimitMap.get(clientIp) || [];
  const validTimestamps = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: "Too many analysis requests. Please wait a minute before trying again.",
    });
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientIp, validTimestamps);
  next();
};

// Security: SSRF (Server-Side Request Forgery) Protection helper
function isPrivateOrRestrictedHost(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase().trim();

  // Localhost & metadata hostnames
  if (
    cleanHost === "localhost" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal") ||
    cleanHost.endsWith(".lan")
  ) {
    return true;
  }

  // IP v4 Loopback, Private ranges, Metadata IP (169.254.169.254)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanHost.match(ipv4Regex);
  if (match) {
    const [, p1, p2] = match.map(Number);
    // 127.0.0.0/8 (Loopback)
    if (p1 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (p1 === 10) return true;
    // 172.16.0.0/12 (Private)
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (p1 === 192 && p2 === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata service)
    if (p1 === 169 && p2 === 254) return true;
    // 0.0.0.0
    if (p1 === 0) return true;
  }

  // IPv6 Loopback & link-local
  if (cleanHost === "::1" || cleanHost === "0:0:0:0:0:0:0:1" || cleanHost.startsWith("fe80:") || cleanHost.startsWith("fd")) {
    return true;
  }

  return false;
}

// Initialize Google GenAI on server side
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Route for website analysis with Rate Limiting & Input Validation
app.post("/api/analyze", rateLimiter, async (req, res) => {
  try {
    const { url, lang = "en" } = req.body;

    // Security: Input validation & length limits
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return res.status(400).json({ error: "A valid URL string is required." });
    }

    if (url.length > 2048) {
      return res.status(400).json({ error: "URL exceeds maximum permitted length (2048 characters)." });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL format provided." });
    }

    // Security: Protocol restriction (HTTP/HTTPS only)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({ error: "Only HTTP and HTTPS protocols are allowed." });
    }

    // Security: SSRF Validation to prevent targeting local or cloud infrastructure
    if (isPrivateOrRestrictedHost(parsedUrl.hostname)) {
      return res.status(400).json({ error: "Access to private or local network addresses is prohibited." });
    }

    // Language whitelist validation
    const allowedLangs = ["en", "hi", "es", "de", "fr"];
    const safeLang = typeof lang === "string" && allowedLangs.includes(lang.toLowerCase()) ? lang.toLowerCase() : "en";

    const languageNames: Record<string, string> = {
      en: "English",
      hi: "Hindi (हिंदी)",
      es: "Spanish (Español)",
      de: "German (Deutsch)",
      fr: "French (Français)",
    };
    const targetLanguage = languageNames[safeLang] || "English";

    // Real server-side fetch attempt for header inspection & initial DOM scraping
    const startTime = Date.now();
    let fetchSuccess = false;
    let statusCode = 0;
    let headersObj: Record<string, string> = {};
    let htmlSnippet = "";
    let pageSizeBytes = 0;
    let ttfbMs = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(parsedUrl.href, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebAuditBot/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      ttfbMs = Date.now() - startTime;
      statusCode = response.status;
      fetchSuccess = response.ok;

      response.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      const text = await response.text();
      pageSizeBytes = text.length;
      htmlSnippet = text.substring(0, 8000); // Send first 8KB to Gemini for analysis
    } catch (err: any) {
      console.warn("Server fetch attempt fallback:", err?.message || "Fetch aborted");
      ttfbMs = Date.now() - startTime;
    }

    // Prepare prompt and structural schema for Gemini 3.6 Flash
    const ai = getAi();
    // Security: Sanitize inputs inserted into prompt against prompt injection
    const safeOrigin = parsedUrl.origin.replace(/["\n\r]/g, "");
    const safeHref = parsedUrl.href.replace(/["\n\r]/g, "");

    const prompt = `Perform a comprehensive 360-degree website audit and analysis for the website domain: "${safeOrigin}".
Target URL: ${safeHref}
Target Output Language for all summary text, titles, issues, recommendations, sales pitches, and action items: ${targetLanguage}.
Live HTTP Fetch Status: ${statusCode || "Failed/Blocked"}
TTFB (Response time): ${ttfbMs} ms
Page Size (bytes): ${pageSizeBytes}
HTTP Headers Detected: ${JSON.stringify(headersObj)}
HTML Content Snippet:
${htmlSnippet || "HTML content unavailable due to network/CORS/bot protection, perform intelligent domain estimation based on domain authority."}

Generate a thorough, highly detailed JSON report covering all fields in ${targetLanguage}:
1. Executive Overview & Scores (Overall, SEO, Performance, Security, CRM/Lead Potential)
2. SEO Analysis (Title, Meta description, OpenGraph, Canonical, Headings structure, Alt text audit, Sitemap/Robots check, Top Keywords, Keyword opportunities, SEO issues & fixes)
3. Performance Metrics (Load speed breakdown, Core Web Vitals estimates: TTFB, FCP, LCP, CLS, Asset distribution estimate, Bottlenecks & Optimization actions)
4. Security Scan & Best Practices (HTTPS check, SSL status, Security Headers checklist [CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy], Cookie safety, Risk Rating, Security hardening recommendations)
5. CRM & Business Intelligence (Industry vertical, Target audience, Detected contact methods / social handles, Tech stack detection, CRM Lead Rating 0-100, Recommended Outreach Pitch & Sales Hook for agencies/CRM sales)
6. UX & Mobile Optimization (Responsiveness score, Readability, Color contrast assessment, Mobile UX tips)
7. Action Plan / Priority Roadmap (High, Medium, Low priority fixes)
`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING },
            domain: { type: Type.STRING },
            analyzedAt: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            overallGrade: { type: Type.STRING },
            summary: { type: Type.STRING },
            scores: {
              type: Type.OBJECT,
              properties: {
                seo: { type: Type.NUMBER },
                performance: { type: Type.NUMBER },
                security: { type: Type.NUMBER },
                crmLead: { type: Type.NUMBER },
                ux: { type: Type.NUMBER },
              },
              required: ["seo", "performance", "security", "crmLead", "ux"],
            },
            seo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                h1Count: { type: Type.NUMBER },
                hasOpenGraph: { type: Type.BOOLEAN },
                hasCanonical: { type: Type.BOOLEAN },
                hasRobotsTxt: { type: Type.BOOLEAN },
                hasSitemap: { type: Type.BOOLEAN },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      recommendation: { type: Type.STRING },
                    },
                    required: ["type", "title", "description", "recommendation"],
                  },
                },
              },
              required: ["title", "description", "keywords", "issues"],
            },
            performance: {
              type: Type.OBJECT,
              properties: {
                loadTimeMs: { type: Type.NUMBER },
                ttfbMs: { type: Type.NUMBER },
                fcpSeconds: { type: Type.NUMBER },
                lcpSeconds: { type: Type.NUMBER },
                clsScore: { type: Type.NUMBER },
                pageSizeKb: { type: Type.NUMBER },
                requestsCount: { type: Type.NUMBER },
                assetBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      sizeKb: { type: Type.NUMBER },
                      percentage: { type: Type.NUMBER },
                    },
                    required: ["category", "sizeKb", "percentage"],
                  },
                },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["loadTimeMs", "ttfbMs", "pageSizeKb", "insights"],
            },
            security: {
              type: Type.OBJECT,
              properties: {
                isHttps: { type: Type.BOOLEAN },
                sslStatus: { type: Type.STRING },
                headersCheck: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      header: { type: Type.STRING },
                      present: { type: Type.BOOLEAN },
                      value: { type: Type.STRING },
                      impact: { type: Type.STRING },
                    },
                    required: ["header", "present", "impact"],
                  },
                },
                riskLevel: { type: Type.STRING },
                hardeningRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["isHttps", "sslStatus", "headersCheck", "riskLevel", "hardeningRecommendations"],
            },
            crm: {
              type: Type.OBJECT,
              properties: {
                businessCategory: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                leadQualityScore: { type: Type.NUMBER },
                detectedContacts: {
                  type: Type.OBJECT,
                  properties: {
                    emails: { type: Type.ARRAY, items: { type: Type.STRING } },
                    phoneNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    socials: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["emails", "socials"],
                },
                detectedTechStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                salesOutreachPitch: { type: Type.STRING },
                crmValueOpportunity: { type: Type.STRING },
              },
              required: ["businessCategory", "targetAudience", "leadQualityScore", "detectedTechStack", "salesOutreachPitch"],
            },
            roadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING },
                  category: { type: Type.STRING },
                  title: { type: Type.STRING },
                  actionItem: { type: Type.STRING },
                  effort: { type: Type.STRING },
                },
                required: ["priority", "category", "title", "actionItem", "effort"],
              },
            },
          },
          required: [
            "url",
            "domain",
            "analyzedAt",
            "overallScore",
            "overallGrade",
            "summary",
            "scores",
            "seo",
            "performance",
            "security",
            "crm",
            "roadmap",
          ],
        },
      },
    });

    const reportData = JSON.parse(aiResponse.text || "{}");
    return res.json({ success: true, data: reportData });
  } catch (error: any) {
    // Security: Log full error internally on server, but do not leak internal stack traces or secrets to client
    console.error("Error analyzing website:", error?.stack || error?.message || error);
    
    // Generic sanitized error message for client safety
    return res.status(500).json({
      error: "An error occurred while processing the website audit. Please verify the target URL and try again.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
