import { GoogleGenAI, Type } from "@google/genai";

function isPrivateOrRestrictedHost(hostname: string): boolean {
  const cleanHost = hostname.toLowerCase().trim();

  if (
    cleanHost === "localhost" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal") ||
    cleanHost.endsWith(".lan")
  ) {
    return true;
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanHost.match(ipv4Regex);
  if (match) {
    const [, p1, p2] = match.map(Number);
    if (p1 === 127 || p1 === 10) return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    if (p1 === 192 && p2 === 168) return true;
    if (p1 === 169 && p2 === 254) return true;
    if (p1 === 0) return true;
  }

  if (cleanHost === "::1" || cleanHost === "0:0:0:0:0:0:0:1" || cleanHost.startsWith("fe80:") || cleanHost.startsWith("fd")) {
    return true;
  }

  return false;
}

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

export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { url, lang = "en" } = body;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "A valid URL string is required." }),
      };
    }

    if (url.length > 2048) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "URL exceeds maximum permitted length (2048 characters)." }),
      };
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid URL format provided." }),
      };
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Only HTTP and HTTPS protocols are allowed." }),
      };
    }

    if (isPrivateOrRestrictedHost(parsedUrl.hostname)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Access to private or local network addresses is prohibited." }),
      };
    }

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

    const startTime = Date.now();
    let statusCode = 0;
    let headersObj: Record<string, string> = {};
    let htmlSnippet = "";
    let pageSizeBytes = 0;
    let ttfbMs = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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

      response.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      const text = await response.text();
      pageSizeBytes = text.length;
      htmlSnippet = text.substring(0, 8000);
    } catch (err: any) {
      ttfbMs = Date.now() - startTime;
    }

    const ai = getAi();
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
2. SEO Analysis
3. Performance Metrics
4. Security Scan & Best Practices
5. CRM & Business Intelligence
6. UX & Mobile Optimization
7. Action Plan / Priority Roadmap
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
              required: ["title", "description", "h1Count", "hasOpenGraph", "hasCanonical", "hasRobotsTxt", "hasSitemap", "keywords", "issues"],
            },
            performance: {
              type: Type.OBJECT,
              properties: {
                loadTimeSeconds: { type: Type.NUMBER },
                pageSizeMb: { type: Type.NUMBER },
                totalRequests: { type: Type.NUMBER },
                vitals: {
                  type: Type.OBJECT,
                  properties: {
                    ttfbMs: { type: Type.NUMBER },
                    fcpMs: { type: Type.NUMBER },
                    lcpMs: { type: Type.NUMBER },
                    clsScore: { type: Type.NUMBER },
                  },
                  required: ["ttfbMs", "fcpMs", "lcpMs", "clsScore"],
                },
                bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                optimizations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["loadTimeSeconds", "pageSizeMb", "totalRequests", "vitals", "bottlenecks", "optimizations"],
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
                industry: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                leadScore: { type: Type.NUMBER },
                detectedContacts: {
                  type: Type.OBJECT,
                  properties: {
                    emailFound: { type: Type.BOOLEAN },
                    phoneFound: { type: Type.BOOLEAN },
                    formFound: { type: Type.BOOLEAN },
                    socialLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["emailFound", "phoneFound", "formFound", "socialLinks"],
                },
                techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                agencyPitch: { type: Type.STRING },
                salesOpportunity: { type: Type.STRING },
              },
              required: ["industry", "targetAudience", "leadScore", "detectedContacts", "techStack", "agencyPitch", "salesOpportunity"],
            },
            ux: {
              type: Type.OBJECT,
              properties: {
                isResponsive: { type: Type.BOOLEAN },
                readabilityGrade: { type: Type.STRING },
                contrastScore: { type: Type.STRING },
                mobileTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["isResponsive", "readabilityGrade", "contrastScore", "mobileTips"],
            },
            actionPlan: {
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
            "ux",
            "actionPlan",
          ],
        },
      },
    });

    const reportData = JSON.parse(aiResponse.text || "{}");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: reportData }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while processing the website audit.",
      }),
    };
  }
};
