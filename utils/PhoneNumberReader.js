import { readFileSync } from 'fs';

export class PhoneNumberReader {
  static readNumbersFromFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }
}