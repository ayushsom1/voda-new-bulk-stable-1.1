// // @ts-check
// import { test, expect } from '@playwright/test';
// import { writeFileSync, mkdirSync } from 'fs';
// import { join } from 'path';
// import { LoginPage } from '../pages/LoginPage.js';
// import { FastDataReader } from '../utils/FastDataReader.js';

// // Initialize fast TXT data readers for all batches (10x faster loading)
// const dataReader1 = new FastDataReader('data/phone_number_batch1.txt');
// const dataReader2 = new FastDataReader('data/phone_number_batch2.txt');
// const dataReader3 = new FastDataReader('data/phone_number_batch3.txt');
// const dataReader4 = new FastDataReader('data/phone_number_batch4.txt');

// test.beforeEach('Login to Cpos4', async ({ page }) => {
//   // Block CSS and image resources for faster execution
//   await page.route('**', route => {
//     const url = route.request().url();
//     const resourceType = route.request().resourceType();
    
//     // Allow captcha-related resources
//     if (url.includes('captcha') || url.includes('Captcha') || 
//         url.includes('refresh') || url.includes('Refresh')) {
//       route.continue();
//       return;
//     }
    
//     // Block images (except captcha)
//     if (resourceType === 'image' || 
//         url.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|bmp|tiff)(\?.*)?$/i)) {
//       route.abort();
//       return;
//     }
    
//     // Block stylesheets
//     if (resourceType === 'stylesheet' || 
//         url.match(/\.(css|scss|sass|less)(\?.*)?$/i)) {
//       route.abort();
//       return;
//     }
    
//     // Block fonts
//     if (resourceType === 'font' || 
//         url.match(/\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i) ||
//         url.includes('/fonts/')) {
//       route.abort();
//       return;
//     }
    
//     // Block media files
//     if (resourceType === 'media' || 
//         url.match(/\.(mp4|avi|mov|wmv|flv|mp3|wav|ogg)(\?.*)?$/i)) {
//       route.abort();
//       return;
//     }
    
//     // Block non-essential scripts (analytics, ads, etc.)
//     if (url.includes('analytics') || url.includes('tracking') || 
//         url.includes('ads') || url.includes('facebook') || 
//         url.includes('google-analytics') || url.includes('gtag') ||
//         url.includes('doubleclick')) {
//       route.abort();
//       return;
//     }
    
//     // Allow all other requests
//     route.continue();
//   });
  
//   const loginPage = new LoginPage(page);
//   await loginPage.goto();
//   await loginPage.fillCredentials('Del415649', 'Wild@1212');
//   await loginPage.solveCaptchaIfAvailableForLogin();
//   await loginPage.submit();
// });

// test('Block All numbers in the Batch 1 CSV file', async ({ page }) => {
//   const loginPage = new LoginPage(page);
//   const phoneNumbers = dataReader1.getAllPhoneNumbers();
  
//   if (!phoneNumbers || phoneNumbers.length === 0) {
//     throw new Error('No phone numbers found in batch 1');
//   }
  
//   await loginPage.navigateToNumberBlockUnblockDirect();

//   let cycleCount = 0;
//   const startTime = Date.now();
//   const runTime = 30 * 60 * 1000; // 3 minutes in milliseconds
  
//   while (Date.now() - startTime < runTime) {
//     cycleCount++;
//     console.log(`[BATCH-1] Starting cycle ${cycleCount} - Processing ${phoneNumbers.length} numbers`);
    
//     let blockedCount = 0;
//     let notFoundCount = 0;

//     for (let i = 0; i < phoneNumbers.length; i++) {
//       const phoneNumber = phoneNumbers[i].toString();
//       console.log(`[BATCH-1] Cycle ${cycleCount} - Processing ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);
      
//       try {
//         await loginPage.fillBlockNumberForm('191', phoneNumber);
//         await loginPage.clickTextboxAndSolveCaptcha();
//         await loginPage.submitBlockPageForm();
//         if (await loginPage.isNoRecordsToDisplay()) {
//           notFoundCount++;
//         } else {
//           await loginPage.selectFirstResultCheckbox();
//           await loginPage.submitBlockAction();
//           await loginPage.expectBlockConfirmation(phoneNumber);
//           blockedCount++;
//           await loginPage.confirmBlockOk();
//         }
//       } catch (error) {
//         console.log(`[BATCH-1] Cycle ${cycleCount} - Skipping ${phoneNumber} due to error: ${error.message}`);
//         try {
//           await loginPage.navigateToNumberBlockUnblockDirect();
//         } catch (navError) {
//           console.log(`[BATCH-1] Navigation reset failed, continuing anyway`);
//         }
//         continue;
//       }
//     }
    
//     const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
//     const remaining = 3 - elapsed;
//     console.log(`[BATCH-1] Cycle ${cycleCount} completed - Blocked: ${blockedCount}, Not Found: ${notFoundCount} | Time: ${elapsed.toFixed(1)}min elapsed, ${remaining.toFixed(1)}min remaining`);
//   }
// });

// test('Block All numbers in the Batch 2 TXT file', async ({ page }) => {
//   const loginPage = new LoginPage(page);
//   const phoneNumbers = dataReader2.getAllPhoneNumbers();
  
//   if (!phoneNumbers || phoneNumbers.length === 0) {
//     throw new Error('No phone numbers found in batch 2');
//   }
  
//   await loginPage.navigateToNumberBlockUnblockDirect();

//   let cycleCount = 0;
//   const startTime = Date.now();
//   const runTime = 30 * 60 * 1000; // 3 minutes in milliseconds
  
//   while (Date.now() - startTime < runTime) {
//     cycleCount++;
//     console.log(`[BATCH-2] Starting cycle ${cycleCount} - Processing ${phoneNumbers.length} numbers`);
    
//     let blockedCount = 0;
//     let notFoundCount = 0;

//     for (let i = 0; i < phoneNumbers.length; i++) {
//       const phoneNumber = phoneNumbers[i].toString();
//       console.log(`[BATCH-2] Cycle ${cycleCount} - Processing ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);
      
//       try {
//         await loginPage.fillBlockNumberForm('191', phoneNumber);
//         await loginPage.clickTextboxAndSolveCaptcha();
//         await loginPage.submitBlockPageForm();
//         if (await loginPage.isNoRecordsToDisplay()) {
//           notFoundCount++;
//         } else {
//           await loginPage.selectFirstResultCheckbox();
//           await loginPage.submitBlockAction();
//           await loginPage.expectBlockConfirmation(phoneNumber);
//           blockedCount++;
//           await loginPage.confirmBlockOk();
//         }
//       } catch (error) {
//         console.log(`[BATCH-2] Cycle ${cycleCount} - Skipping ${phoneNumber} due to error: ${error.message}`);
//         try {
//           await loginPage.navigateToNumberBlockUnblockDirect();
//         } catch (navError) {
//           console.log(`[BATCH-2] Navigation reset failed, continuing anyway`);
//         }
//         continue;
//       }
//     }
    
//     const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
//     const remaining = 3 - elapsed;
//     console.log(`[BATCH-2] Cycle ${cycleCount} completed - Blocked: ${blockedCount}, Not Found: ${notFoundCount} | Time: ${elapsed.toFixed(1)}min elapsed, ${remaining.toFixed(1)}min remaining`);
//   }
// });

// test('Block All numbers in the Batch 3 TXT file', async ({ page }) => {
//   const loginPage = new LoginPage(page);
//   const phoneNumbers = dataReader3.getAllPhoneNumbers();
  
//   if (!phoneNumbers || phoneNumbers.length === 0) {
//     throw new Error('No phone numbers found in batch 3');
//   }
  
//   await loginPage.navigateToNumberBlockUnblockDirect();

//   let cycleCount = 0;
//   const startTime = Date.now();
//   const runTime = 30 * 60 * 1000; // 3 minutes in milliseconds
  
//   while (Date.now() - startTime < runTime) {
//     cycleCount++;
//     console.log(`[BATCH-3] Starting cycle ${cycleCount} - Processing ${phoneNumbers.length} numbers`);
    
//     let blockedCount = 0;
//     let notFoundCount = 0;

//     for (let i = 0; i < phoneNumbers.length; i++) {
//       const phoneNumber = phoneNumbers[i].toString();
//       console.log(`[BATCH-3] Cycle ${cycleCount} - Processing ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);
      
//       try {
//         await loginPage.fillBlockNumberForm('191', phoneNumber);
//         await loginPage.clickTextboxAndSolveCaptcha();
//         await loginPage.submitBlockPageForm();
//         if (await loginPage.isNoRecordsToDisplay()) {
//           notFoundCount++;
//         } else {
//           await loginPage.selectFirstResultCheckbox();
//           await loginPage.submitBlockAction();
//           await loginPage.expectBlockConfirmation(phoneNumber);
//           blockedCount++;
//           await loginPage.confirmBlockOk();
//         }
//       } catch (error) {
//         console.log(`[BATCH-3] Cycle ${cycleCount} - Skipping ${phoneNumber} due to error: ${error.message}`);
//         try {
//           await loginPage.navigateToNumberBlockUnblockDirect();
//         } catch (navError) {
//           console.log(`[BATCH-3] Navigation reset failed, continuing anyway`);
//         }
//         continue;
//       }
//     }
    
//     const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
//     const remaining = 3 - elapsed;
//     console.log(`[BATCH-3] Cycle ${cycleCount} completed - Blocked: ${blockedCount}, Not Found: ${notFoundCount} | Time: ${elapsed.toFixed(1)}min elapsed, ${remaining.toFixed(1)}min remaining`);
//   }
// });

// test('Block All numbers in the Batch 4 TXT file', async ({ page }) => {
//   const loginPage = new LoginPage(page);
//   const phoneNumbers = dataReader4.getAllPhoneNumbers();
  
//   if (!phoneNumbers || phoneNumbers.length === 0) {
//     throw new Error('No phone numbers found in batch 4');
//   }
  
//   await loginPage.navigateToNumberBlockUnblockDirect();

//   let cycleCount = 0;
//   const startTime = Date.now();
//   const runTime = 30 * 60 * 1000; // 3 minutes in milliseconds
  
//   while (Date.now() - startTime < runTime) {
//     cycleCount++;
//     console.log(`[BATCH-4] Starting cycle ${cycleCount} - Processing ${phoneNumbers.length} numbers`);
    
//     let blockedCount = 0;
//     let notFoundCount = 0;

//     for (let i = 0; i < phoneNumbers.length; i++) {
//       const phoneNumber = phoneNumbers[i].toString();
//       console.log(`[BATCH-4] Cycle ${cycleCount} - Processing ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);
      
//       try {
//         await loginPage.fillBlockNumberForm('191', phoneNumber);
//         await loginPage.clickTextboxAndSolveCaptcha();
//         await loginPage.submitBlockPageForm();
//         if (await loginPage.isNoRecordsToDisplay()) {
//           notFoundCount++;
//         } else {
//           await loginPage.selectFirstResultCheckbox();
//           await loginPage.submitBlockAction();
//           await loginPage.expectBlockConfirmation(phoneNumber);
//           blockedCount++;
//           await loginPage.confirmBlockOk();
//         }
//       } catch (error) {
//         console.log(`[BATCH-4] Cycle ${cycleCount} - Skipping ${phoneNumber} due to error: ${error.message}`);
//         try {
//           await loginPage.navigateToNumberBlockUnblockDirect();
//         } catch (navError) {
//           console.log(`[BATCH-4] Navigation reset failed, continuing anyway`);
//         }
//         continue;
//       }
//     }
    
//     const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
//     const remaining = 3 - elapsed;
//     console.log(`[BATCH-4] Cycle ${cycleCount} completed - Blocked: ${blockedCount}, Not Found: ${notFoundCount} | Time: ${elapsed.toFixed(1)}min elapsed, ${remaining.toFixed(1)}min remaining`);
//   }
// });
