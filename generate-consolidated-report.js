#!/usr/bin/env node

import { HTMLReportGenerator } from './utils/HTMLReportGenerator.js';
import { readdirSync, unlinkSync } from 'fs';

console.log('🚀 Generating Consolidated HTML Report from all batch results...\n');

const startTime = Date.now();

try {
  // Find all batch result JSON files from all batches
  const allTestFiles = readdirSync('.')
    .filter(file => file.match(/^api-batch[1-6]-cycle\d+-test-.*\.json$/))
    .sort();
  
  if (allTestFiles.length === 0) {
    console.log('❌ No batch test result files found');
    console.log('   Make sure to run the batch continuous tests first:');
    console.log('   npm run batches:parallel');
    process.exit(1);
  }
  
  console.log(`📊 Found ${allTestFiles.length} batch result files:`);
  
  // Group files by batch
  const batchGroups = {
    batch1: allTestFiles.filter(f => f.includes('api-batch1-')),
    batch2: allTestFiles.filter(f => f.includes('api-batch2-')),
    batch3: allTestFiles.filter(f => f.includes('api-batch3-')),
    batch4: allTestFiles.filter(f => f.includes('api-batch4-')),
    batch5: allTestFiles.filter(f => f.includes('api-batch5-')),
    batch6: allTestFiles.filter(f => f.includes('api-batch6-'))
  };
  
  Object.entries(batchGroups).forEach(([batch, files]) => {
    console.log(`   📦 ${batch}: ${files.length} result files`);
  });
  
  // Generate timestamp for consolidated report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const consolidatedReportPath = `api-consolidated-report-${timestamp}.html`;
  
  console.log(`\n📈 Generating consolidated report: ${consolidatedReportPath}`);
  
  // Calculate execution time for report generation
  const reportGenerationStart = Date.now();
  
  // Generate the HTML report using all found files
  HTMLReportGenerator.generateReport(consolidatedReportPath);
  
  const reportGenerationTime = ((Date.now() - reportGenerationStart) / 1000).toFixed(2);
  console.log(`📊 Report generation completed in ${reportGenerationTime} seconds`);
  
  console.log(`\n✅ Consolidated report generated successfully!`);
  console.log(`📁 Report: ${consolidatedReportPath}`);
  
  // Ask user if they want to clean up temporary files
  console.log(`\n🧹 Cleaning up ${allTestFiles.length} temporary JSON files...`);
  
  let cleanedCount = 0;
  allTestFiles.forEach(file => {
    try {
      unlinkSync(file);
      cleanedCount++;
    } catch (e) {
      console.log(`   ⚠️  Could not delete ${file}: ${e.message}`);
    }
  });
  
  console.log(`✅ Cleaned up ${cleanedCount}/${allTestFiles.length} temporary files`);
  
  const endTime = Date.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`⏱️  Total execution time: ${executionTime} seconds`);
  console.log(`\n🌐 Open ${consolidatedReportPath} in your browser to view the consolidated results!`);
  
} catch (error) {
  console.error('\n❌ Consolidated report generation failed:', error.message);
  process.exit(1);
}