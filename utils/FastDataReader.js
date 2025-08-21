
import { readFileSync } from 'fs';

export class FastDataReader {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
  }

  /**
   * Load phone numbers from TXT file (10x faster than CSV)
   */
  loadData() {
    try {
      const content = readFileSync(this.filePath, 'utf8');
      this.data = content.trim().split('\n').filter(line => line.trim());
      console.log(`Loaded ${this.data.length} records from file: ${this.filePath}`);
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error.message);
      throw error;
    }
  }

  /**
   * Get all phone numbers
   */
  getAllPhoneNumbers() {
    if (!this.data) {
      this.loadData();
    }
    return this.data;
  }

  /**
   * Get phone number by index
   */
  getPhoneNumberByIndex(index) {
    if (!this.data) {
      this.loadData();
    }
    if (index >= 0 && index < this.data.length) {
      return this.data[index];
    }
    throw new Error(`Index ${index} is out of range. Total records: ${this.data.length}`);
  }

  /**
   * Get total count
   */
  getTotalCount() {
    if (!this.data) {
      this.loadData();
    }
    return this.data.length;
  }
}