# Voda Test Automation

This project contains automated tests for the Voda cpos3 system using Playwright.

## Features

- **Page Object Model**: Organized test structure with reusable page objects
- **Dynamic Data Support**: Read phone numbers from Excel/CSV files
- **Captcha Handling**: Automated captcha solving for both login and block pages
- **Excel Data Integration**: Process multiple phone numbers dynamically

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Data Files

### Phone Numbers Data
Place your phone numbers in `data/phone_numbers.csv` with the following format:

```csv
phoneNumber
9711495016
9711551816
9711683221
9711687460
9711718815
9711765038
9711878713
9711970996
9711976992
9711984715
```

### Supported File Formats
- **CSV**: `data/phone_numbers.csv` (recommended)
- **Excel**: `data/phone_numbers.xlsx`

## Running Tests

### Single Phone Number Test
```bash
npx playwright test --grep "Block number validation - single number"
```

### All Phone Numbers Test
```bash
npx playwright test --grep "Block number validation with dynamic data"
```

### All Tests
```bash
npx playwright test
```

## Test Structure

### Files
- `tests/login.spec.js` - Main test file
- `pages/LoginPage.js` - Page Object for login and block operations
- `utils/ExcelDataReader.js` - Utility for reading Excel/CSV data

### Key Methods

#### ExcelDataReader
- `getAllPhoneNumbers()` - Get all phone numbers from file
- `getPhoneNumberByIndex(index)` - Get specific phone number by index
- `getRandomPhoneNumber()` - Get random phone number
- `getNextPhoneNumber(currentIndex)` - Get next phone number sequentially

#### LoginPage
- `navigateToNumberBlockUnblock()` - Navigate to block/unblock page
- `fillBlockNumberForm(status, phoneNumber)` - Fill block number form
- `clickTextboxAndSolveCaptcha()` - Handle captcha on block page
- `submitBlockPageForm()` - Submit the form

## Configuration

### Test Data
- **Number Status**: Default is '191' (can be modified in test)
- **Phone Numbers**: Read from `data/phone_numbers.csv`
- **Credentials**: Hardcoded in test (consider environment variables for production)

### Captcha Handling
- **Login Page**: Reads from hidden input `#txtCaptcha`
- **Block Page**: Reads hex-encoded value from `#txtCaptcha` and decodes it

## Adding New Phone Numbers

1. Edit `data/phone_numbers.csv`
2. Add new phone numbers in the format:
```csv
phoneNumber
new_number_here
```

3. Run the test to process all numbers

## Troubleshooting

### Common Issues
1. **Captcha not found**: Check if the page structure has changed
2. **Excel file not found**: Ensure `data/phone_numbers.csv` exists
3. **Import errors**: Run `npm install` to ensure all dependencies are installed

### Debug Mode
Add `await page.pause();` in tests to pause execution for manual inspection.
