import { AuditReport } from '../types';

export const SAMPLE_WEBSITES = [
  { name: 'Shopify', url: 'https://shopify.com', tag: 'E-Commerce Leader' },
  { name: 'Stripe', url: 'https://stripe.com', tag: 'Fintech Platform' },
  { name: 'Notion', url: 'https://notion.so', tag: 'SaaS Workspace' },
  { name: 'Linear', url: 'https://linear.app', tag: 'Product Management' },
];

export const DEMO_PRESET_REPORT: AuditReport = {
  url: 'https://shopify.com',
  domain: 'shopify.com',
  analyzedAt: new Date().toISOString(),
  overallScore: 92,
  overallGrade: 'A',
  summary:
    'Shopify exhibits exceptional performance, bulletproof security headers, and top-tier SEO optimizations. High lead score with vast B2B integration potential.',
  scores: {
    seo: 94,
    performance: 89,
    security: 96,
    crmLead: 95,
    ux: 91,
  },
  seo: {
    title: 'Shopify: Enterprise Ecommerce Software & Point of Sale',
    description:
      'Shopify is a complete commerce platform that lets you start, grow, and manage a business. Create your online store with Shopify today.',
    h1Count: 1,
    hasOpenGraph: true,
    hasCanonical: true,
    hasRobotsTxt: true,
    hasSitemap: true,
    keywords: ['ecommerce', 'online store', 'pos system', 'sell online', 'checkout', 'merchant platform'],
    issues: [
      {
        type: 'pass',
        title: 'Title Tag Length & Keyword Density',
        description: 'Title tag length is 58 characters, optimal for search result displays.',
        recommendation: 'Maintain title tag format across localized domain variants.',
      },
      {
        type: 'pass',
        title: 'Meta Description Optimization',
        description: 'Compelling meta description present with target conversion keywords.',
        recommendation: 'Periodically A/B test description copy to maximize CTR.',
      },
      {
        type: 'warning',
        title: 'Image Alt Attributes Audit',
        description: '3 out of 42 decorative SVG illustrations lack descriptive alt text.',
        recommendation: 'Add alt="" or descriptive labels to improve screen reader accessibility scores.',
      },
      {
        type: 'pass',
        title: 'Canonical Tag & URL Structure',
        description: 'Canonical tag properly targets https://www.shopify.com without query parameter leakage.',
        recommendation: 'Ensure localized /fr or /de subpaths reference proper hreflang canonicals.',
      },
    ],
  },
  performance: {
    loadTimeMs: 1240,
    ttfbMs: 110,
    fcpSeconds: 0.8,
    lcpSeconds: 1.6,
    clsScore: 0.02,
    pageSizeKb: 1420,
    requestsCount: 38,
    assetBreakdown: [
      { category: 'JavaScript', sizeKb: 680, percentage: 48 },
      { category: 'Images & SVGs', sizeKb: 410, percentage: 29 },
      { category: 'CSS Styles', sizeKb: 180, percentage: 12 },
      { category: 'Fonts', sizeKb: 110, percentage: 8 },
      { category: 'Other/XHR', sizeKb: 40, percentage: 3 },
    ],
    insights: [
      'TTFB is extremely fast (110ms) thanks to Cloudflare Edge CDN caching.',
      'LCP is well within Google recommended range (<2.5s).',
      'Consider deferring secondary analytics scripts to save ~120KB initial execution thread overhead.',
    ],
  },
  security: {
    isHttps: true,
    sslStatus: 'Valid TLS 1.3 (Cloudflare Inc ECC CA-3)',
    riskLevel: 'Low',
    headersCheck: [
      {
        header: 'Strict-Transport-Security (HSTS)',
        present: true,
        value: 'max-age=31536000; includeSubDomains; preload',
        impact: 'Enforces HTTPS strictly across all browser sessions and subdomains.',
      },
      {
        header: 'Content-Security-Policy (CSP)',
        present: true,
        value: "default-src 'self' https://cdn.shopify.com ...",
        impact: 'Prevents cross-site scripting (XSS) and unauthorized script injection.',
      },
      {
        header: 'X-Frame-Options',
        present: true,
        value: 'DENY',
        impact: 'Protects visitors against clickjacking attacks.',
      },
      {
        header: 'X-Content-Type-Options',
        present: true,
        value: 'nosniff',
        impact: 'Prevents MIME-type sniffing vulnerabilities.',
      },
      {
        header: 'Referrer-Policy',
        present: true,
        value: 'strict-origin-when-cross-origin',
        impact: 'Limits sensitive referrer header leakage to third parties.',
      },
    ],
    hardeningRecommendations: [
      'Maintain automated dependency audit checks for third-party npm runtime bundles.',
      'Ensure API endpoints enforce strict CORS origin validation.',
    ],
  },
  crm: {
    businessCategory: 'B2B & B2C E-Commerce Infrastructure',
    targetAudience: 'Entrepreneurs, SMB merchants, D2C Brands, Enterprise Retailers',
    leadQualityScore: 95,
    detectedContacts: {
      emails: ['support@shopify.com', 'press@shopify.com', 'sales@shopify.com'],
      phoneNumbers: ['+1 888 746-7439'],
      socials: [
        'https://twitter.com/Shopify',
        'https://linkedin.com/company/shopify',
        'https://facebook.com/shopify',
      ],
    },
    detectedTechStack: ['Shopify Core', 'Cloudflare CDN', 'React', 'GraphQL', 'Bugsnag', 'Google Tag Manager'],
    salesOutreachPitch:
      'Hi Shopify Partnership Team! We noticed your merchant landing page operates with a 92 overall score. Our enterprise optimization suite can assist in lowering JS bundle initial execution times by 18%, boosting high-volume mobile merchant conversions.',
    crmValueOpportunity: 'High Enterprise Contract Potential ($50,000+ ARR)',
  },
  roadmap: [
    {
      priority: 'High',
      category: 'Performance',
      title: 'Optimize Initial JS Bundle Footprint',
      actionItem: 'Split non-critical analytics and chat widget scripts into dynamic delayed chunks.',
      effort: 'Moderate',
    },
    {
      priority: 'Medium',
      category: 'SEO',
      title: 'Audit Decorative SVG Accessibility Labels',
      actionItem: 'Ensure decorative SVGs explicitly carry aria-hidden="true" or role="img" with alt label.',
      effort: 'Easy',
    },
    {
      priority: 'Low',
      category: 'CRM',
      title: 'Automate Lead Scoring Webhook Integration',
      actionItem: 'Connect identified high-intent visitors directly into Salesforce or HubSpot CRM workflows.',
      effort: 'Easy',
    },
  ],
};
