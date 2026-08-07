export interface SeoIssue {
  type: 'error' | 'warning' | 'pass';
  title: string;
  description: string;
  recommendation: string;
}

export interface AssetBreakdownItem {
  category: string;
  sizeKb: number;
  percentage: number;
}

export interface SecurityHeaderCheck {
  header: string;
  present: boolean;
  value?: string;
  impact: string;
}

export interface DetectedContacts {
  emails: string[];
  phoneNumbers: string[];
  socials: string[];
}

export interface RoadmapItem {
  priority: 'High' | 'Medium' | 'Low';
  category: 'SEO' | 'Performance' | 'Security' | 'CRM' | 'UX';
  title: string;
  actionItem: string;
  effort: 'Easy' | 'Moderate' | 'Complex';
}

export interface AuditReport {
  url: string;
  domain: string;
  analyzedAt: string;
  overallScore: number;
  overallGrade: string;
  summary: string;
  scores: {
    seo: number;
    performance: number;
    security: number;
    crmLead: number;
    ux: number;
  };
  seo: {
    title: string;
    description: string;
    h1Count?: number;
    hasOpenGraph: boolean;
    hasCanonical: boolean;
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    keywords: string[];
    issues: SeoIssue[];
  };
  performance: {
    loadTimeMs: number;
    ttfbMs: number;
    fcpSeconds: number;
    lcpSeconds: number;
    clsScore: number;
    pageSizeKb: number;
    requestsCount?: number;
    assetBreakdown: AssetBreakdownItem[];
    insights: string[];
  };
  security: {
    isHttps: boolean;
    sslStatus: string;
    headersCheck: SecurityHeaderCheck[];
    riskLevel: 'Low' | 'Medium' | 'High';
    hardeningRecommendations: string[];
  };
  crm: {
    businessCategory: string;
    targetAudience: string;
    leadQualityScore: number;
    detectedContacts: DetectedContacts;
    detectedTechStack: string[];
    salesOutreachPitch: string;
    crmValueOpportunity: string;
  };
  roadmap: RoadmapItem[];
}

export interface SavedAuditSummary {
  id: string;
  url: string;
  domain: string;
  date: string;
  overallScore: number;
  grade: string;
  report: AuditReport;
}
