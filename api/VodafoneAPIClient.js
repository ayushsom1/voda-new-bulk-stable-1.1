import { request } from '@playwright/test';

/**
 * Vodafone cpos4 API Client
 * Provides API-based access to blocking/unblocking operations
 */
export class VodafoneAPIClient {
  constructor() {
    this.baseURL = 'https://cpos4.vodafoneidea.com';
    this.apiContext = null;
    this.sessionCookies = null;
    this.authToken = null;
    this.isAuthenticated = false;
    
    // PHASE 1 Optimization: Cache session state
    this.navigationComplete = false;
    this.cachedCaptcha = null;
    this.captchaExpiry = null;
    this.sessionToken = null;
  }

  /**
   * Initialize API context with proper headers and cookies
   */
  async init() {
    this.apiContext = await request.newContext({
      baseURL: this.baseURL,
      ignoreHTTPSErrors: true, // Ignore SSL certificate errors for corporate sites
      extraHTTPHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
  }

  /**
   * Authenticate with the Vodafone cpos4 system
   * @param {string} username 
   * @param {string} password 
   * @param {string} [captcha] - Optional captcha value
   * @param {boolean} [forceReinit] - Force complete reinitialization of API context
   */
  async authenticate(username, password, captcha = '', forceReinit = false) {
    // Force reinitialization if requested (for session recovery)
    if (forceReinit && this.apiContext) {
      console.log('🔄 Force reinitializing API context for session recovery...');
      await this.apiContext.dispose();
      this.apiContext = null;
      this.sessionCookies = null;
      this.isAuthenticated = false;
      
      // PHASE 1: Reset optimization cache
      this.navigationComplete = false;
      this.cachedCaptcha = null;
      this.captchaExpiry = null;
      this.sessionToken = null;
    }
    
    if (!this.apiContext) {
      await this.init();
    }

    try {
      // Step 1: Get login page to establish session
      console.log('🔐 Fetching login page...');
      const loginPageResponse = await this.apiContext.get('/');
      
      if (!loginPageResponse.ok()) {
        throw new Error(`Failed to fetch login page: ${loginPageResponse.status()}`);
      }

      // Extract cookies from login page
      const cookies = loginPageResponse.headers()['set-cookie'];
      if (cookies) {
        this.sessionCookies = cookies;
      }

      // Step 2: Submit login credentials using discovered endpoint
      console.log('🔐 Submitting login credentials...');
      const loginData = new URLSearchParams({
        errorMsg: '',
        username: username,
        password: password,
        'login-form-type': 'pwd'
      });

      const loginResponse = await this.apiContext.post('/pkmslogin.form', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseURL + '/',
          'Origin': this.baseURL
        },
        data: loginData.toString()
      });

      // Check if login was successful (redirects indicate success)
      const loginResponseText = await loginResponse.text();
      
      if (loginResponse.ok() || loginResponse.status() === 302) {
        // Extract additional cookies after login
        const loginCookies = loginResponse.headers()['set-cookie'];
        
        // Validate that we actually got session cookies and proper response
        if (loginCookies && loginResponseText.length > 50000) {
          this.isAuthenticated = true;
          this.sessionCookies = loginCookies;
          console.log('✅ Authentication successful');
        } else {
          this.isAuthenticated = false;
          console.log(`❌ Authentication failed - Invalid response (${loginResponseText.length} chars)`);
          return false;
        }
        
        // Follow redirect to main page
        try {
          await this.apiContext.get('/cPOSWeb/jsp/common/main.jsp');
          await this.apiContext.get('/cPOSWeb/jsp/common/login.do?method=getTaskForUserProfile');
        } catch (redirectError) {
          console.log('⚠️ Redirect following failed, but auth may be successful');
        }
        
        return true;
      } else {
        console.log(`❌ Authentication failed - HTTP status: ${loginResponse.status()}`);
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Search for a phone number in the system
   * @param {string} phoneNumber - Phone number to search
   * @param {string} numberStatus - Status code (e.g., '191' for blocking)
   */
  async searchNumber(phoneNumber, numberStatus = '191') {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const searchStartTime = Date.now();
    try {
      console.log(`🔍 Searching for number: ${phoneNumber}`);
      
      // PHASE 1 OPTIMIZATION: Navigate only once per session
      if (!this.navigationComplete) {
        const navStartTime = Date.now();
        await this.apiContext.get('/cPOSWeb/switchMod.do?prefix=/jsp/inventory&page=/cellNumberBlockRelease.do?method=getView&fromMenu=Y');
        const navDuration = Date.now() - navStartTime;
        console.log(`  📍 Navigation took: ${navDuration}ms (cached for session)`);
        this.navigationComplete = true;
      } else {
        console.log(`  📍 Navigation: CACHED (0ms)`);
      }
      
      // Step 2: Initial search request
      const initialSearchStartTime = Date.now();
      const initialSearchData = new URLSearchParams({
        EnttypeId: '71',
        usertype: '',
        entTypeId: '71',
        numberStatus: numberStatus,
        hlr: '',
        cellNumber: phoneNumber,
        cellNoCategoryType: '',
        cellNoCategory: '',
        cellNoCategoryPatternName: '',
        entityType: '22',
        entityGroup: '1066',
        entity: '194587289',
        entity_ID: '',
        minimumPrice: '',
        maximumPrice: '',
        inSeriesVal: ''
      });

      const initialResponse = await this.apiContext.post('/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=getViewAll&entityType=22', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseURL + '/cPOSWeb/switchMod.do?prefix=/jsp/inventory&page=/cellNumberBlockRelease.do?method=getView&fromMenu=Y'
        },
        data: initialSearchData.toString()
      });
      const initialSearchDuration = Date.now() - initialSearchStartTime;
      console.log(`  🔍 Initial search took: ${initialSearchDuration}ms`);

      if (!initialResponse.ok()) {
        return {
          success: false,
          error: `Initial search failed: ${initialResponse.status()}`
        };
      }

      // PHASE 1 OPTIMIZATION: Cache captcha for 30 seconds
      let captchaValue = 'TEST';
      const now = Date.now();
      
      if (!this.cachedCaptcha || !this.captchaExpiry || now > this.captchaExpiry) {
        const captchaStartTime = Date.now();
        const captchaResponse = await this.apiContext.post('/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=getCustTypeList&acttypeId=TEST');
        
        if (captchaResponse.ok()) {
          const captchaText = await captchaResponse.text();
          const captchaMatch = captchaText.match(/value="([^"]+)"/);
          if (captchaMatch) {
            captchaValue = captchaMatch[1];
            this.cachedCaptcha = captchaValue;
            this.captchaExpiry = now + 30000; // Cache for 30 seconds
          }
        }
        const captchaDuration = Date.now() - captchaStartTime;
        console.log(`  🔐 Captcha took: ${captchaDuration}ms (cached for 30s)`);
      } else {
        captchaValue = this.cachedCaptcha;
        console.log(`  🔐 Captcha: CACHED (0ms)`);
      }

      // Step 4: Final search with captcha
      const finalSearchStartTime = Date.now();
      const searchData = new URLSearchParams({
        'org.apache.struts.taglib.html.TOKEN': '', // Will be extracted from page
        numberStatus: numberStatus,
        hlr: '',
        cellNumber: phoneNumber,
        cellNoCategoryType: '',
        cellNoCategory: '',
        cellNoCategoryPatternName: '',
        entityType: '22',
        entityGroup: '1066',
        entity: '194587289',
        minimumPrice: '',
        maximumPrice: '',
        inSeriesVal: '',
        captcha1: captchaValue,
        txtCaptcha: '', // Hidden captcha field
        captcha: captchaValue
      });


      const searchResponse = await this.apiContext.post('/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=getViewAll', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseURL + '/cPOSWeb/switchMod.do?prefix=/jsp/inventory&page=/cellNumberBlockRelease.do?method=getView&fromMenu=Y'
        },
        data: searchData.toString()
      });
      const finalSearchDuration = Date.now() - finalSearchStartTime;
      console.log(`  🎯 Final search took: ${finalSearchDuration}ms`);

      if (searchResponse.ok()) {
        const responseText = await searchResponse.text();
        
        // Parse response to determine if number exists
        const hasResults = !responseText.includes('No Records to Display');
        
        const totalSearchDuration = Date.now() - searchStartTime;
        console.log(`  ⏱️ Total search duration: ${totalSearchDuration}ms`);
        
        return {
          success: true,
          hasResults,
          responseData: responseText,
          captchaUsed: captchaValue
        };
      } else {
        return {
          success: false,
          error: `Search failed: ${searchResponse.status()}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Block a phone number using the complete discovered API flow
   * @param {string} phoneNumber - Phone number to block
   * @param {string} numberStatus - Status code
   */
  async blockNumber(phoneNumber, numberStatus = '191') {
    const startTime = Date.now();
    try {
      console.log(`🚫 Blocking number: ${phoneNumber}`);
      
      // First search for the number
      const searchStartTime = Date.now();
      const searchResult = await this.searchNumber(phoneNumber, numberStatus);
      const searchDuration = Date.now() - searchStartTime;
      console.log(`⏱️ Search took: ${searchDuration}ms`);
      
      if (!searchResult.success) {
        return {
          success: false,
          error: `Search failed: ${searchResult.error}`
        };
      }

      if (!searchResult.hasResults) {
        const totalDuration = Date.now() - startTime;
        console.log(`⏱️ Total operation took: ${totalDuration}ms (no_records)`);
        return {
          success: true,
          action: 'no_records',
          message: `Number ${phoneNumber} not found in system`
        };
      }

      // If number exists, proceed with the complete blocking flow
      console.log(`📋 Number found, proceeding with blocking ${phoneNumber}...`);
      
      // Step 1: Extract token from the search result page
      let token = '';
      if (searchResult.responseData && searchResult.responseData.includes('TOKEN')) {
        const tokenMatch = searchResult.responseData.match(/name="org\.apache\.struts\.taglib\.html\.TOKEN" value="([^"]+)"/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }

      // Step 2: Submit the blocking request using the discovered API endpoint
      const blockStartTime = Date.now();
      const blockData = new URLSearchParams({
        'org.apache.struts.taglib.html.TOKEN': token,
        'EnttypeId': '',
        'usertype': '',
        'entTypeId': '',
        'numberStatus': numberStatus,
        'hlr': '',
        'cellNumber': phoneNumber,
        'cellNoCategoryType': '',
        'cellNoCategory': '',
        'cellNoCategoryPatternName': '',
        'entityType': '22',
        'entityGroup': '1066',
        'entity': '194587289',
        'entity_ID': '',
        'minimumPrice': '',
        'maximumPrice': '',
        'inSeriesVal': '',
        'checkbox': 'checkbox',
        'checkedArray': phoneNumber,
        'pageNumber': '1'
      });

      const blockResponse = await this.apiContext.post('/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=blockCellNumbers&entityType=22', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': this.baseURL,
          'Referer': this.baseURL + '/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=getViewAll'
        },
        data: blockData.toString()
      });

      if (blockResponse.ok()) {
        const responseText = await blockResponse.text();
        const blockDuration = Date.now() - blockStartTime;
        console.log(`⏱️ Block request took: ${blockDuration}ms`);
        
        // Parse the blocking result
        let blockStatus = 'unknown';
        let message = `Block operation attempted for ${phoneNumber}`;
        
        if (responseText.includes('Following Cell Number(s) are Blocked')) {
          blockStatus = 'blocked';
          message = `Number ${phoneNumber} blocked successfully`;
        } else if (responseText.includes('exceeded blocking count')) {
          blockStatus = 'exceeded_limit';
          message = `Number ${phoneNumber} has exceeded blocking count`;
        } else if (responseText.includes('already blocked')) {
          blockStatus = 'already_blocked';
          message = `Number ${phoneNumber} is already blocked`;
        } else if (responseText.includes('error') || responseText.includes('Error')) {
          blockStatus = 'error';
          message = `Error blocking number ${phoneNumber}`;
        } else {
          // Check for session expiration/timeout issues
          const lowerResponse = responseText.toLowerCase();
          if (lowerResponse.includes('session') && (lowerResponse.includes('expired') || lowerResponse.includes('timeout'))) {
            blockStatus = 'session_expired';
            message = `Session expired for ${phoneNumber}`;
            console.log(`🔐 SESSION EXPIRED detected for ${phoneNumber}`);
          } else if (lowerResponse.includes('timeout') || lowerResponse.includes('time out')) {
            blockStatus = 'timeout';
            message = `Request timeout for ${phoneNumber}`;
            console.log(`⏰ TIMEOUT detected for ${phoneNumber}`);
          } else if (lowerResponse.includes('limit') || lowerResponse.includes('exceeded')) {
            blockStatus = 'rate_limited';
            message = `Rate limit exceeded for ${phoneNumber}`;
            console.log(`🚫 RATE LIMIT detected for ${phoneNumber}`);
          } else if (lowerResponse.includes('maintenance') || lowerResponse.includes('unavailable')) {
            blockStatus = 'maintenance';
            message = `System maintenance for ${phoneNumber}`;
            console.log(`🔧 MAINTENANCE detected for ${phoneNumber}`);
          } else {
            blockStatus = 'unknown';
            message = `Unknown response pattern for ${phoneNumber}`;
            console.log(`❓ UNKNOWN PATTERN for ${phoneNumber}: ${responseText.substring(0, 200)}...`);
          }
        }

        // Step 3: Submit OK confirmation to complete the flow
        try {
          // Extract new token for confirmation step
          const confirmTokenMatch = responseText.match(/name="org\.apache\.struts\.taglib\.html\.TOKEN" value="([^"]+)"/);
          const confirmToken = confirmTokenMatch ? confirmTokenMatch[1] : '';
          
          const confirmData = new URLSearchParams({
            'org.apache.struts.taglib.html.TOKEN': confirmToken
          });

          await this.apiContext.post('/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=getView', {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Origin': this.baseURL,
              'Referer': this.baseURL + '/cPOSWeb/jsp/inventory/cellNumberBlockRelease.do?method=blockCellNumbers&entityType=22'
            },
            data: confirmData.toString()
          });
        } catch (confirmError) {
          console.log('⚠️ Confirmation step failed, but blocking may have succeeded');
        }
        
        const totalDuration = Date.now() - startTime;
        console.log(`⏱️ Total operation took: ${totalDuration}ms (${blockStatus})`);
        
        return {
          success: true,
          action: blockStatus,
          message: message,
          responseData: responseText.substring(0, 1000) // Truncate for logging
        };
      } else {
        return {
          success: false,
          error: `Block operation failed: ${blockResponse.status()}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PHASE 3: Maximum performance parallel processing
   * @param {string[]} phoneNumbers - Array of phone numbers to block
   * @param {string} numberStatus - Status code
   * @param {number} batchSize - Number of concurrent requests (aggressively optimized to 5)
   */
  async blockNumbersBatch(phoneNumbers, numberStatus = '191', batchSize = 5) {
    console.log(`🚫 PHASE 3: Starting maximum performance batch operation for ${phoneNumbers.length} numbers`);
    
    const results = [];
    const failed = [];
    let operationCount = 0;
    
    // PHASE 3: More aggressive concurrent processing
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      console.log(`📦 Processing MEGA-batch ${Math.floor(i/batchSize) + 1} (${batch.length} numbers)`);
      
      // PHASE 3: More frequent proactive session refresh every 10 operations
      if (operationCount > 0 && operationCount % 10 === 0) {
        console.log(`🔄 PHASE 3: Proactive session refresh after ${operationCount} operations`);
        await this.refreshSession();
      }
      
      const batchPromises = batch.map(async (phoneNumber) => {
        try {
          const result = await this.blockNumber(phoneNumber, numberStatus);
          results.push({ phoneNumber, ...result });
          return result;
        } catch (error) {
          failed.push({ phoneNumber, error: error.message });
          console.error(`❌ Failed to block ${phoneNumber}:`, error.message);
          return { success: false, error: error.message };
        }
      });

      // Wait for mega-batch to complete
      await Promise.all(batchPromises);
      operationCount += batch.length;
      
    }

    const successful = results.filter(r => r.success);
    const blocked = successful.filter(r => r.action === 'blocked');
    const notFound = successful.filter(r => r.action === 'no_records');

    return {
      total: phoneNumbers.length,
      successful: successful.length,
      blocked: blocked.length,
      notFound: notFound.length,
      failed: failed.length,
      results,
      failed
    };
  }

  /**
   * Unblock a phone number
   * @param {string} phoneNumber - Phone number to unblock
   * @param {string} numberStatus - Status code
   */
  async unblockNumber(phoneNumber, numberStatus = '191') {
    try {
      console.log(`✅ Unblocking number: ${phoneNumber}`);
      
      const unblockData = new URLSearchParams({
        action: 'unblock',
        cellNumber: phoneNumber,
        numberStatus: numberStatus,
      });

      const unblockResponse = await this.apiContext.post('/numberManagement/unblock', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseURL + '/numberManagement'
        },
        data: unblockData.toString()
      });

      if (unblockResponse.ok()) {
        const responseText = await unblockResponse.text();
        const isUnblocked = responseText.includes('unblocked successfully');
        
        return {
          success: true,
          action: 'unblocked',
          message: `Number ${phoneNumber} ${isUnblocked ? 'unblocked successfully' : 'unblock attempted'}`,
          responseData: responseText
        };
      } else {
        return {
          success: false,
          error: `Unblock operation failed: ${unblockResponse.status()}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up resources
   */
  async dispose() {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }

  /**
   * Refresh session by visiting View/Update profile page and returning to block form
   * This helps maintain session state for long-running operations
   */
  async refreshSession() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      console.log('🔄 Refreshing session by visiting profile page...');
      
      // Step 1: Visit the profile/update page to refresh session using the correct URL
      const profileResponse = await this.apiContext.get('/cPOSWeb/jsp/inventory/switchMod.do?prefix=/jsp/login&page=/login.do?method=updateUserProfile&mode=view');
      
      if (!profileResponse.ok()) {
        console.log('⚠️ Profile page visit failed, but continuing...');
      } else {
        console.log('✅ Profile page visited successfully');
      }

      // Step 2: Navigate back to the block/unblock form page using the correct URL
      const blockFormResponse = await this.apiContext.get('/cPOSWeb/jsp/login/switchMod.do?prefix=/jsp/inventory&page=/cellNumberBlockRelease.do?method=getView&fromMenu=Y');
      
      if (blockFormResponse.ok()) {
        console.log('✅ Session refreshed successfully');
        return {
          success: true,
          message: 'Session refreshed by visiting profile page'
        };
      } else {
        console.log('⚠️ Block form navigation failed, but profile visit completed');
        return {
          success: false,
          message: 'Profile visited but block form navigation failed'
        };
      }
    } catch (error) {
      console.log('❌ Session refresh failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasApiContext: !!this.apiContext,
      hasSessionCookies: !!this.sessionCookies
    };
  }
}