// @ts-check
import { expect } from '@playwright/test';

export class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'https://cpos3.vodafoneidea.com';

    // Login page selectors
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.captchaInput = page.locator('#txtInput').first();
    this.submitButton = page.locator('a').filter({ hasText: 'Enter >' });

    // Raw selector used inside evaluate to read hidden captcha value if present
    this.captchaValueSelector = '#txtCaptcha';

    // Block number validation selectors
    this.numberManagementLink = page.getByRole('link', { name: 'Number management', exact: true });
    this.numberBlockReleaseLink = page.getByRole('link', { name: 'Number block/release' });
    this.numberBlockUnblockLink = page.getByRole('link', { name: 'Number block/unblock' });
    this.numberStatusSelect = page.locator('select[name="numberStatus"]');
    this.cellNumberInput = page.locator('input[name="cellNumber"]');
    this.goSubmitButton = page.getByRole('link', { name: 'Go  Submit' });
    this.textboxInput = page.getByRole('textbox');
    this.blockPageLoginButton = page.locator('a').filter({ hasText: 'Login' });

    // Block/unblock results and actions
    this.noRecordsText = page.getByText('No Records to Display');
    this.resultCheckbox = page.locator('input[name="checkbox"]');
    this.blockSubmitLink = page.getByRole('link', { name: 'Block\u00A0 Submit', exact: true });
    this.unblockSubmitLink = page.getByRole('link', { name: 'Unblock\u00A0 Submit', exact: true });
    this.blockConfirmationForm = page.locator('form[name="cellNumberBlockReleaseForm"]');
    this.okSubmitLink = page.getByRole('link', { name: 'Ok\u00A0 Submit' });
    
    // Captcha refresh button
    this.refreshCaptchaButton = page.getByRole('cell', { name: 'Refresh Captcha', exact: true }).locator('a');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async fillCredentials(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /**
   * Attempts to auto-fill captcha from a hidden/disabled input if the page exposes it.
   * Falls back to pausing for manual input when not available.
   */
  async solveCaptchaIfAvailableForLogin() {
    const captchaValue = await this.page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el && 'value' in el ? /** @type {HTMLInputElement} */ (el).value : '';
    }, this.captchaValueSelector);

    if (captchaValue) {
      await this.captchaInput.fill(captchaValue);
    } else {
      console.log('Captcha not found')
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async solveCaptchaIfAvailableForBlockPage(){
    const captchaValue = await this.page.evaluate(() => {
      // Get the hidden captcha value
      const hiddenCaptchaEl = document.querySelector('#txtCaptcha');
      if (!hiddenCaptchaEl || !('value' in hiddenCaptchaEl)) {
        return '';
      }
      
      const hexEncodedValue = /** @type {HTMLInputElement} */ (hiddenCaptchaEl).value;
      
      // Improved hexDecode function that handles the encoding properly
      function hexDecode(hex) {
        try {
          // Remove any non-hex characters and ensure even length
          hex = hex.replace(/[^0-9A-Fa-f]/g, '');
          if (hex.length % 2 !== 0) {
            hex = '0' + hex;
          }
          
          let str = '';
          for (let i = 0; i < hex.length; i += 2) {
            const charCode = parseInt(hex.substr(i, 2), 16);
            // Only add printable ASCII characters
            if (charCode >= 32 && charCode <= 126) {
              str += String.fromCharCode(charCode);
            }
          }
          return str;
        } catch (e) {
          console.error('Error decoding hex:', e);
          return '';
        }
      }
      
      // Decode the hex-encoded captcha value
      return hexDecode(hexEncodedValue);
    });

    if (captchaValue) {
      // Fill the decoded captcha value into the visible input field
      await this.page.locator('input[name="captcha"]').fill(captchaValue);
      return true;
    } else {
      console.log('Captcha not found on block page');
      return false;
    }
  }

  // Block number validation methods
  async navigateToNumberBlockUnblock() {
    await this.numberManagementLink.click();
    await this.numberManagementLink.click();
    await this.numberBlockReleaseLink.click();
    await this.numberBlockUnblockLink.click();
  }

  async navigateToNumberBlockUnblockDirect() {
    await this.page.goto('https://cpos3.vodafoneidea.com/cPOSWeb/switchMod.do?prefix=/jsp/inventory&page=/cellNumberBlockRelease.do?method=getView&fromMenu=Y');
  }

  async fillBlockNumberForm(numberStatus = '194', cellNumber = '123456789') {
    let captchaValue = null;
    
    // Intercept network response to extract captcha
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('getCustTypeList') && response.status() === 200
    );
    
    await this.numberStatusSelect.selectOption(numberStatus);
    await this.cellNumberInput.click();
    await this.cellNumberInput.fill(cellNumber);
    await this.goSubmitButton.click();
    
    // Wait for captcha response and extract the value
    try {
      const response = await responsePromise;
      const url = response.url();
      const matches = url.match(/acttypeId=([A-Z0-9]{5})$/);
      if (matches) {
        captchaValue = matches[1];
        console.log(`Captcha extracted from network: ${captchaValue}`);
      }
    } catch (error) {
      console.log('Failed to extract captcha from network, will fallback to DOM method');
    }
    
    // Store captcha for later use
    this._extractedCaptcha = captchaValue;
    
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickTextboxAndSolveCaptcha() {
    await this.textboxInput.click();
    
    // Use extracted captcha if available
    if (this._extractedCaptcha) {
      console.log(`Using extracted captcha: ${this._extractedCaptcha}`);
      await this.page.locator('input[name="captcha"]').fill(this._extractedCaptcha);
      return;
    }
    
    // Fallback to original method
    console.log('No extracted captcha, using DOM method');
    const maxRetries = 3;
    let retryCount = 0;
    let captchaSolved = false;
    
    while (!captchaSolved && retryCount < maxRetries) {
      retryCount++;
      console.log(`Attempting to solve captcha - Retry ${retryCount}/${maxRetries}`);
      
      await this.page.waitForTimeout(100);
      captchaSolved = await this.solveCaptchaIfAvailableForBlockPage();
      
      if (!captchaSolved) {
        console.log(`Captcha attempt ${retryCount} failed. Refreshing captcha and retrying...`);
        
        if (retryCount < maxRetries) {
          await this.refreshCaptchaButton.click();
          await this.page.waitForTimeout(300);
          await this.textboxInput.click();
        }
      } else {
        console.log(`Captcha solved successfully on attempt ${retryCount}`);
      }
    }
    
    if (!captchaSolved) {
      console.error(`Failed to solve captcha after ${maxRetries} attempts`);
      throw new Error(`Captcha could not be solved after ${maxRetries} retries`);
    }
  }

  async submitBlockPageForm() {
    await this.blockPageLoginButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isNoRecordsToDisplay() {
    return await this.noRecordsText.isVisible();
  }

  async selectFirstResultCheckbox() {
    await this.resultCheckbox.check();
  }

  async submitBlockAction() {
    await this.blockSubmitLink.click();
  }

  async expectBlockConfirmation(phoneNumber) {
    await this.blockConfirmationForm.waitFor();
    await expect(this.blockConfirmationForm).toContainText(`Following Cell Number(s) are Blocked: ${phoneNumber}`);
  }

  async confirmBlockOk() {
    await this.okSubmitLink.click();
  }


  async submitUnblockAction() {
    await this.unblockSubmitLink.click();
  }

  async expectUnblockConfirmation(phoneNumber) {
    await this.blockConfirmationForm.waitFor();
    await expect(this.blockConfirmationForm).toContainText(`Following Cell Number(s) are Unblocked: ${phoneNumber}`);
  }

}


