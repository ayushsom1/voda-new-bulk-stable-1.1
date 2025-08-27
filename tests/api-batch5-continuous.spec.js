import { test, expect } from '@playwright/test';
import { VodafoneAPIClient } from '../api/VodafoneAPIClient.js';
import { PhoneNumberReader } from '../utils/PhoneNumberReader.js';
import { HTMLReportGenerator } from '../utils/HTMLReportGenerator.js';
import { writeFileSync, unlinkSync } from 'fs';

test('API Batch 5 Continuous Automation', async () => {
  console.log('🚀 Starting Batch 5 continuous automation...\n');
  
  // Test configuration
  const DURATION_MINUTES = 40;
  const DURATION_MS = DURATION_MINUTES * 60 * 1000;
  const username = 'Del388535';
  const password = 'Delhi@2025';
  
  // Batch file for this spec
  const batchFile = './data/phone_number_batch5.txt';
  
  // Session tracking
  const startTime = Date.now();
  const sessionId = new Date().toISOString().replace(/[:.]/g, '-');
  let cycleCount = 0;
  let totalNumbersProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let allCycleResults = [];
  
  console.log(`📅 Session ID: ${sessionId}`);
  console.log(`⏱️  Duration: ${DURATION_MINUTES} minutes`);
  console.log(`📦 Batch File: ${batchFile}`);
  console.log(`🕐 Start Time: ${new Date(startTime).toLocaleString()}\n`);
  
  // Initialize API client once for entire session
  const apiClient = new VodafoneAPIClient();
  let sessionAuthSuccess = false;
  
  try {
    // Single authentication for entire session
    console.log('🔍 Initializing API client for entire session...');
    await apiClient.init();
    
    console.log('🔐 Authenticating for entire session...');
    sessionAuthSuccess = await apiClient.authenticate(username, password);
    
    if (!sessionAuthSuccess) {
      throw new Error('Session authentication failed - cannot continue');
    }
    
    console.log('✅ Session authentication successful - will be shared across all cycles\n');
    
    // Main execution loop
    while (Date.now() - startTime < DURATION_MS) {
      cycleCount++;
      const cycleStartTime = Date.now();
      const remainingTime = Math.round((DURATION_MS - (Date.now() - startTime)) / 1000 / 60);
      
      // Refresh session every 10 cycles to prevent session timeout
      if (cycleCount > 1 && cycleCount % 10 === 1) {
        console.log('🔄 Refreshing session to prevent timeout...');
        const refreshResult = await apiClient.refreshSession();
        if (refreshResult.success) {
          console.log('✅ Session refreshed successfully');
        } else {
          console.log('⚠️ Session refresh failed, continuing with existing session');
        }
      }
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 BATCH 5 - CYCLE ${cycleCount} - ${remainingTime} minutes remaining`);
      console.log(`${'='.repeat(80)}`);
      
      const cycleResults = {
        cycleNumber: cycleCount,
        startTime: new Date(cycleStartTime).toISOString(),
        batchResults: [],
        cycleStats: {
          totalNumbers: 0,
          successful: 0,
          failed: 0,
          duration: 0
        }
      };
      
      // Check if we still have time
      if (Date.now() - startTime >= DURATION_MS) {
        console.log('⏰ Time limit reached, stopping batch processing');
        break;
      }
      
      const batchStartTime = Date.now();
      console.log(`📦 Processing Batch 5: ${batchFile}`);
      
      let batchResult = {
        batchNumber: 5,
        batchFile: batchFile,
        startTime: new Date(batchStartTime).toISOString(),
        totalNumbers: 0,
        successful: 0,
        failed: 0,
        duration: 0,
        numbers: [],
        authSuccess: sessionAuthSuccess,
        error: null
      };
      
      try {
        // Read phone numbers
        const phoneNumbers = PhoneNumberReader.readNumbersFromFile(batchFile);
        console.log(`   📱 Loaded ${phoneNumbers.length} numbers`);
        batchResult.totalNumbers = phoneNumbers.length;
        
        // Process each number using shared session authentication
        for (let i = 0; i < phoneNumbers.length; i++) {
          // Check time limit during processing
          if (Date.now() - startTime >= DURATION_MS) {
            console.log('   ⏰ Time limit reached during number processing');
            break;
          }
          
          const testNumber = phoneNumbers[i];
          console.log(`   🚫 Processing ${testNumber} (${i + 1}/${phoneNumbers.length})`);
          
          try {
            const blockResult = await apiClient.blockNumber(testNumber, '191');
            
            // Handle session expiration by completely reinitializing and re-authenticating
            if (blockResult.action === 'session_expired') {
              console.log(`   🔄 Session expired - force reinitializing API context and re-authenticating...`);
              const reauth = await apiClient.authenticate(username, password, '', true); // forceReinit = true
              if (reauth) {
                console.log(`   ✅ Complete re-authentication successful, retrying ${testNumber}...`);
                const retryResult = await apiClient.blockNumber(testNumber, '191');
                blockResult.success = retryResult.success;
                blockResult.action = retryResult.action;
                blockResult.message = retryResult.message;
              } else {
                console.log(`   ❌ Re-authentication failed for ${testNumber}`);
                blockResult.message = `Re-authentication failed after session expiration`;
              }
            }
            
            const numberResult = {
              phoneNumber: testNumber,
              success: blockResult.success,
              action: blockResult.action,
              message: blockResult.message,
              timestamp: new Date().toISOString()
            };
            
            batchResult.numbers.push(numberResult);
            
            if (blockResult.success) {
              batchResult.successful++;
              totalSuccessful++;
              console.log(`   ✅ ${testNumber}: ${blockResult.action}`);
            } else {
              batchResult.failed++;
              totalFailed++;
              console.log(`   ❌ ${testNumber}: ${blockResult.message}`);
            }
            
            totalNumbersProcessed++;
            
          } catch (numberError) {
            console.log(`   ❌ ${testNumber}: Error - ${numberError.message}`);
            batchResult.numbers.push({
              phoneNumber: testNumber,
              success: false,
              action: 'error',
              message: numberError.message,
              timestamp: new Date().toISOString()
            });
            batchResult.failed++;
            totalFailed++;
          }
        }
        
      } catch (batchError) {
        console.log(`   ❌ Batch 5 failed: ${batchError.message}`);
        batchResult.error = batchError.message;
        
      } finally {
        batchResult.duration = Date.now() - batchStartTime;
        console.log(`   ⏱️  Batch 5 completed in ${Math.round(batchResult.duration / 1000)}s`);
      }
      
      cycleResults.batchResults.push(batchResult);
      cycleResults.cycleStats.totalNumbers += batchResult.totalNumbers;
      cycleResults.cycleStats.successful += batchResult.successful;
      cycleResults.cycleStats.failed += batchResult.failed;
      
      cycleResults.duration = Date.now() - cycleStartTime;
      cycleResults.cycleStats.duration = cycleResults.duration;
      allCycleResults.push(cycleResults);
      
      // Brief cycle completion log only
      console.log(`✅ Batch 5 - Cycle ${cycleCount} completed - ${cycleResults.cycleStats.totalNumbers} numbers processed`);
    }
    
  } catch (sessionError) {
    console.error('💥 Session error:', sessionError);
    throw sessionError;
    
  } finally {
    // Dispose API client once at end of entire session
    await apiClient.dispose();
    console.log('🧹 API client disposed for entire session');
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    const overallSuccessRate = totalNumbersProcessed > 0 
      ? ((totalSuccessful / totalNumbersProcessed) * 100).toFixed(1) 
      : 0;
    
    // Final session summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('🏁 BATCH 5 SESSION COMPLETED');
    console.log(`${'='.repeat(80)}`);
    console.log(`📅 Session ID: ${sessionId}`);
    console.log(`🕐 Start Time: ${new Date(startTime).toLocaleString()}`);
    console.log(`🕐 End Time: ${new Date(endTime).toLocaleString()}`);
    console.log(`⏱️  Actual Duration: ${Math.round(actualDuration / 1000 / 60)} minutes ${Math.round((actualDuration / 1000) % 60)} seconds`);
    console.log(`🔄 Total Cycles: ${cycleCount}`);
    console.log(`📱 Total Numbers Processed: ${totalNumbersProcessed}`);
    console.log(`✅ Total Successful: ${totalSuccessful}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`📈 Overall Success Rate: ${overallSuccessRate}%`);
    console.log(`⚡ Average Numbers/Minute: ${Math.round(totalNumbersProcessed / (actualDuration / 1000 / 60))}`);
    
    // Create batch result files for HTML report generator (compatible format)
    const batchReports = [];
    let batchCounter = 1;
    
    allCycleResults.forEach(cycle => {
      cycle.batchResults.forEach(batch => {
        const batchReport = {
          testName: `API Batch 5 - Cycle ${cycle.cycleNumber}`,
          phoneNumberFile: batch.batchFile,
          totalNumbers: batch.totalNumbers,
          credentials: { username: username, password: '***HIDDEN***' },
          testDate: batch.startTime,
          results: {
            authentication: batch.authSuccess,
            blockOperations: batch.numbers
          },
          summary: {
            authSuccess: batch.authSuccess,
            totalProcessed: batch.numbers.length,
            successCount: batch.successful,
            failureCount: batch.failed,
            actionSummary: {
              blocked: batch.numbers.filter(n => n.action === 'blocked').length,
              already_blocked: batch.numbers.filter(n => n.action === 'already_blocked').length,
              no_records: batch.numbers.filter(n => n.action === 'no_records').length,
              exceeded_limit: batch.numbers.filter(n => n.action === 'exceeded_limit').length,
              error: batch.numbers.filter(n => n.action === 'error').length
            }
          }
        };
        
        // Create temporary JSON file for this batch
        const tempFileName = `api-batch5-cycle${cycle.cycleNumber}-test-${sessionId}.json`;
        writeFileSync(tempFileName, JSON.stringify(batchReport, null, 2));
        batchReports.push(tempFileName);
      });
    });
    
    // Keep temp JSON files for consolidated reporting (don't clean up)
    console.log(`📊 Batch 5 session completed - ${batchReports.length} result files saved for consolidated reporting`);
    
    // Validation - log if no numbers were processed
    if (totalNumbersProcessed === 0) {
      console.log('⚠️ Warning: No numbers were processed during the session');
    }
    console.log('\n✨ Batch 5 continuous automation completed successfully!');
  }
});