import jsPDF from 'jspdf';
import { AuditReport } from '../types';

export function downloadPdfReport(report: AuditReport): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkAddPage = (neededHeight: number = 10) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin + 10;
      addPageHeader();
    }
  };

  const addPageHeader = () => {
    // Subtle top page header bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 182, 212); // cyan-500
    doc.text('WebAudit 360 AI - Professional Audit Report', margin, 5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(report.domain || 'webaudit.ai', pageWidth - margin, 5.5, { align: 'right' });
  };

  // --- Title Header Banner ---
  doc.setFillColor(11, 17, 32); // Dark slate bg
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Cyan Accent Line
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 33.5, pageWidth, 1.5, 'F');

  // App Logo / Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('WebAudit 360 AI', margin, 15);

  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212);
  doc.text('AUTOMATED WEBSITE PERFORMANCE, SECURITY & CRM AUDIT REPORT', margin, 21);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`URL: ${report.url}`, margin, 27);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 27, { align: 'right' });

  y = 42;

  // --- Executive Score Overview Box ---
  checkAddPage(30);
  doc.setFillColor(241, 245, 249); // slate-100 box
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD');

  // Overall Score Badge Box
  const scoreColor = report.overallScore >= 80 ? [16, 185, 129] : report.overallScore >= 60 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(margin + 4, y + 4, 28, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${report.overallScore}`, margin + 18, y + 13, { align: 'center' });
  doc.setFontSize(7);
  doc.text('/ 100', margin + 18, y + 18, { align: 'center' });

  // Overall Summary text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Overall Grade: ${report.overallGrade || 'B+'}`, margin + 36, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(report.summary || 'Comprehensive website audit summary.', contentWidth - 42);
  doc.text(summaryLines.slice(0, 2), margin + 36, y + 15);

  y += 32;

  // --- Category Scores Table ---
  checkAddPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Audit Performance Breakdown', margin, y);
  y += 5;

  const categories = [
    { label: 'SEO Score', score: report.scores?.seo ?? 0 },
    { label: 'Performance Score', score: report.scores?.performance ?? 0 },
    { label: 'Security Score', score: report.scores?.security ?? 0 },
    { label: 'Lead & CRM Potential', score: report.scores?.crmLead ?? 0 },
    { label: 'Mobile & UX Score', score: report.scores?.ux ?? 0 },
  ];

  categories.forEach((cat, idx) => {
    checkAddPage(8);
    const itemY = y + idx * 7;
    
    // Light row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, itemY - 4, contentWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(cat.label, margin + 2, itemY);

    // Progress Bar Background
    const barX = margin + 60;
    const barWidth = 90;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, itemY - 3, barWidth, 4, 1, 1, 'F');

    // Progress Bar Fill
    const fillW = Math.max(2, (cat.score / 100) * barWidth);
    const cColor = cat.score >= 80 ? [16, 185, 129] : cat.score >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(cColor[0], cColor[1], cColor[2]);
    doc.roundedRect(barX, itemY - 3, fillW, 4, 1, 1, 'F');

    // Score Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cColor[0], cColor[1], cColor[2]);
    doc.text(`${cat.score}/100`, barX + barWidth + 5, itemY);
  });

  y += categories.length * 7 + 8;

  // --- Section 2: SEO Audit ---
  checkAddPage(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Search Engine Optimization (SEO)', margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Page Title:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(doc.splitTextToSize(report.seo?.title || 'Not detected', contentWidth - 25)[0], margin + 22, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Meta Description:', margin, y);
  doc.setFont('helvetica', 'normal');
  const descText = doc.splitTextToSize(report.seo?.description || 'Not detected', contentWidth - 32);
  doc.text(descText.slice(0, 2), margin + 30, y);
  y += descText.length > 1 ? 9 : 5;

  // SEO Checks Grid
  checkAddPage(15);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');

  const seoTags = [
    { label: 'H1 Tag', val: `${report.seo?.h1Count ?? 0} found` },
    { label: 'OpenGraph', val: report.seo?.hasOpenGraph ? 'Yes' : 'No' },
    { label: 'Canonical', val: report.seo?.hasCanonical ? 'Yes' : 'No' },
    { label: 'Robots.txt', val: report.seo?.hasRobotsTxt ? 'Yes' : 'No' },
    { label: 'Sitemap', val: report.seo?.hasSitemap ? 'Yes' : 'No' },
  ];

  const colW = contentWidth / seoTags.length;
  seoTags.forEach((tag, i) => {
    const tx = margin + i * colW + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(tag.label, tx, y + 4);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(tag.val, tx, y + 9);
  });

  y += 18;

  // SEO Issues List
  if (report.seo?.issues && report.seo.issues.length > 0) {
    checkAddPage(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Key SEO Audit Issues & Recommendations:', margin, y);
    y += 5;

    report.seo.issues.slice(0, 4).forEach((issue) => {
      checkAddPage(14);
      const isPass = issue.type === 'pass';
      const isWarn = issue.type === 'warning';
      const badgeBg = isPass ? [220, 252, 231] : isWarn ? [254, 243, 199] : [254, 226, 226];
      const badgeText = isPass ? [22, 101, 52] : isWarn ? [146, 64, 14] : [153, 27, 27];

      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(margin, y - 3, 16, 4.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
      doc.text(issue.type.toUpperCase(), margin + 8, y, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(issue.title, margin + 20, y);

      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const recLines = doc.splitTextToSize(`Recommendation: ${issue.recommendation}`, contentWidth - 20);
      doc.text(recLines.slice(0, 2), margin + 20, y);
      y += recLines.length * 4 + 2;
    });
  }

  // --- Section 3: Performance & Security ---
  checkAddPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Core Web Vitals & Security Hardening', margin, y);
  y += 5;

  // Performance Grid Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth / 2 - 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text('PERFORMANCE METRICS', margin + 4, y + 5);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• TTFB Response: ${report.performance?.ttfbMs || 0} ms`, margin + 4, y + 10);
  doc.text(`• First Contentful Paint: ${report.performance?.fcpSeconds || 0}s`, margin + 4, y + 14);
  doc.text(`• Largest Contentful Paint: ${report.performance?.lcpSeconds || 0}s`, margin + 4, y + 18);

  // Security Grid Box
  const secX = margin + contentWidth / 2 + 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(secX, y, contentWidth / 2 - 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144);
  doc.text('SECURITY STATUS', secX + 4, y + 5);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• HTTPS SSL: ${report.security?.isHttps ? 'Valid & Encrypted' : 'Missing HTTPS'}`, secX + 4, y + 10);
  doc.text(`• Risk Level: ${report.security?.riskLevel || 'Low'}`, secX + 4, y + 14);
  doc.text(`• Headers Checked: ${report.security?.headersCheck?.length || 0} security headers`, secX + 4, y + 18);

  y += 28;

  // --- Section 4: Lead Generation & CRM Intelligence ---
  checkAddPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. CRM & Agency Growth Pitch', margin, y);
  y += 5;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Business Industry:`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(report.crm?.businessCategory || 'General Web Service', margin + 32, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Detected Stack:`, margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text((report.crm?.detectedTechStack || ['HTML5', 'React', 'Tailwind']).join(', '), margin + 30, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Sales Pitch:`, margin + 4, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const pitchText = doc.splitTextToSize(report.crm?.salesOutreachPitch || 'High potential for performance optimization.', contentWidth - 30);
  doc.text(pitchText.slice(0, 2), margin + 25, y + 18);

  y += 30;

  // --- Section 5: Priority Action Roadmap ---
  if (report.roadmap && report.roadmap.length > 0) {
    checkAddPage(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. Priority Action Roadmap', margin, y);
    y += 5;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIORITY', margin + 3, y + 4);
    doc.text('CATEGORY', margin + 24, y + 4);
    doc.text('ACTION ITEM & RECOMMENDATION', margin + 52, y + 4);
    doc.text('EFFORT', margin + contentWidth - 12, y + 4);

    y += 6;

    report.roadmap.slice(0, 6).forEach((item, idx) => {
      checkAddPage(10);
      const rowY = y;
      
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY, contentWidth, 7, 'F');
      }

      // Priority Badge
      const isHigh = item.priority === 'High';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(isHigh ? 220 : 71, isHigh ? 38 : 85, isHigh ? 38 : 105);
      doc.text(item.priority, margin + 3, rowY + 4.5);

      // Category
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(item.category, margin + 24, rowY + 4.5);

      // Title & Action Item
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const titleShort = item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title;
      doc.text(titleShort, margin + 52, rowY + 4.5);

      // Effort
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(item.effort, margin + contentWidth - 12, rowY + 4.5);

      y += 7;
    });
  }

  // --- Add Footer with Page Numbers to All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`WebAudit 360 AI - Confidential Audit Report`, margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Sanitize domain name for filename
  const safeDomain = (report.domain || 'report').replace(/[^a-zA-Z0-9.-]/g, '_');
  doc.save(`WebAudit_Report_${safeDomain}.pdf`);
}
