#!/usr/bin/env node

import { HTMLReportGenerator } from './utils/HTMLReportGenerator.js';

console.log('🚀 Generating API Automation Test Report...\n');

try {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `api-automation-report-${timestamp}.html`;
  
  HTMLReportGenerator.generateReport(reportPath);
  
  console.log('\n✅ Report generation completed!');
  console.log(`📁 Report saved as: ${reportPath}`);
  console.log('\n🌐 Open the HTML file in your browser to view the report.');
  
} catch (error) {
  console.error('\n❌ Report generation failed:', error.message);
  process.exit(1);
}