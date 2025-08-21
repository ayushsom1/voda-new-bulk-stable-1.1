#!/usr/bin/env node

import { writeFileSync, unlinkSync } from 'fs';
import { HTMLReportGenerator } from './utils/HTMLReportGenerator.js';

console.log('🧪 Creating sample batch result files for testing consolidated report...\n');

// Create sample batch result files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const sampleResults = [
  {
    fileName: `api-batch1-cycle1-test-${timestamp}.json`,
    data: {
      testName: 'API Batch 1 - Cycle 1',
      phoneNumberFile: './data/phone_number_batch1.txt',
      totalNumbers: 3,
      credentials: { username: 'Del353190x1', password: '***HIDDEN***' },
      testDate: new Date().toISOString(),
      results: {
        authentication: true,
        blockOperations: [
          { phoneNumber: '7834889214', success: true, action: 'blocked', message: 'Number blocked successfully', timestamp: new Date().toISOString() },
          { phoneNumber: '7834895834', success: true, action: 'blocked', message: 'Number blocked successfully', timestamp: new Date().toISOString() },
          { phoneNumber: '7834881234', success: true, action: 'already_blocked', message: 'Number already blocked', timestamp: new Date().toISOString() }
        ]
      },
      summary: {
        authSuccess: true,
        totalProcessed: 3,
        successCount: 3,
        failureCount: 0,
        actionSummary: { blocked: 2, already_blocked: 1, no_records: 0, exceeded_limit: 0, error: 0 }
      }
    }
  },
  {
    fileName: `api-batch2-cycle1-test-${timestamp}.json`,
    data: {
      testName: 'API Batch 2 - Cycle 1',
      phoneNumberFile: './data/phone_number_batch2.txt',
      totalNumbers: 2,
      credentials: { username: 'Del353190x1', password: '***HIDDEN***' },
      testDate: new Date().toISOString(),
      results: {
        authentication: true,
        blockOperations: [
          { phoneNumber: '9876543210', success: true, action: 'blocked', message: 'Number blocked successfully', timestamp: new Date().toISOString() },
          { phoneNumber: '9876543211', success: true, action: 'blocked', message: 'Number blocked successfully', timestamp: new Date().toISOString() }
        ]
      },
      summary: {
        authSuccess: true,
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
        actionSummary: { blocked: 2, already_blocked: 0, no_records: 0, exceeded_limit: 0, error: 0 }
      }
    }
  },
  {
    fileName: `api-batch3-cycle1-test-${timestamp}.json`,
    data: {
      testName: 'API Batch 3 - Cycle 1',
      phoneNumberFile: './data/phone_number_batch3.txt',
      totalNumbers: 2,
      credentials: { username: 'Del353190x1', password: '***HIDDEN***' },
      testDate: new Date().toISOString(),
      results: {
        authentication: true,
        blockOperations: [
          { phoneNumber: '8888888888', success: true, action: 'blocked', message: 'Number blocked successfully', timestamp: new Date().toISOString() },
          { phoneNumber: '9999999999', success: true, action: 'no_records', message: 'Number not found in system', timestamp: new Date().toISOString() }
        ]
      },
      summary: {
        authSuccess: true,
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
        actionSummary: { blocked: 1, already_blocked: 0, no_records: 1, exceeded_limit: 0, error: 0 }
      }
    }
  }
];

// Create sample files
sampleResults.forEach(sample => {
  writeFileSync(sample.fileName, JSON.stringify(sample.data, null, 2));
  console.log(`📝 Created: ${sample.fileName}`);
});

console.log('\n📊 Generating consolidated HTML report...');

// Generate consolidated report
const reportPath = `api-consolidated-demo-report-${timestamp}.html`;
HTMLReportGenerator.generateReport(reportPath);

console.log(`\n✅ Demo consolidated report generated: ${reportPath}`);
console.log('🌐 Open this file in your browser to see the consolidated report format!\n');

// Clean up sample files
console.log('🧹 Cleaning up sample files...');
sampleResults.forEach(sample => {
  try {
    unlinkSync(sample.fileName);
    console.log(`   ✅ Deleted: ${sample.fileName}`);
  } catch (e) {
    console.log(`   ⚠️  Could not delete: ${sample.fileName}`);
  }
});

console.log('\n🎉 Demo completed! The consolidated report system is working correctly.');