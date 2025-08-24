#!/usr/bin/env node

import express from 'express';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Store running processes
const runningProcesses = new Map();

// Configuration storage
let currentConfig = {
  username: '',
  password: '',
  durationMinutes: 30
};

// Serve the main HTML interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get current configuration
app.get('/api/config', (req, res) => {
  res.json(currentConfig);
});

// Update configuration
app.post('/api/config', (req, res) => {
  const { username, password, durationMinutes } = req.body;
  
  if (!username || !password || !durationMinutes) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  currentConfig = {
    username,
    password,
    durationMinutes: parseInt(durationMinutes)
  };
  
  res.json({ message: 'Configuration updated successfully', config: currentConfig });
});

// Get batch file contents
app.get('/api/batches/:batchNumber', (req, res) => {
  const { batchNumber } = req.params;
  const batchFile = path.join(__dirname, 'data', `phone_number_batch${batchNumber}.txt`);
  
  try {
    if (!existsSync(batchFile)) {
      return res.json({ numbers: [] });
    }
    
    const content = readFileSync(batchFile, 'utf8');
    const numbers = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    res.json({ numbers, count: numbers.length });
  } catch (error) {
    res.status(500).json({ error: `Failed to read batch file: ${error.message}` });
  }
});

// Update batch file contents
app.post('/api/batches/:batchNumber', (req, res) => {
  const { batchNumber } = req.params;
  const { numbers } = req.body;
  
  if (!Array.isArray(numbers)) {
    return res.status(400).json({ error: 'Numbers must be an array' });
  }
  
  const batchFile = path.join(__dirname, 'data', `phone_number_batch${batchNumber}.txt`);
  
  try {
    const content = numbers.join('\n');
    writeFileSync(batchFile, content, 'utf8');
    
    res.json({ 
      message: `Batch ${batchNumber} updated successfully`, 
      count: numbers.length 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to write batch file: ${error.message}` });
  }
});

// Upload batch file
app.post('/api/batches/:batchNumber/upload', upload.single('batchFile'), (req, res) => {
  const { batchNumber } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const content = readFileSync(req.file.path, 'utf8');
    const numbers = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const batchFile = path.join(__dirname, 'data', `phone_number_batch${batchNumber}.txt`);
    writeFileSync(batchFile, numbers.join('\n'), 'utf8');
    
    res.json({ 
      message: `Batch ${batchNumber} uploaded successfully`, 
      count: numbers.length 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to process uploaded file: ${error.message}` });
  }
});

// Get available NPM scripts
app.get('/api/scripts', (req, res) => {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    // Filter relevant automation scripts
    const automationScripts = Object.keys(scripts).filter(key => 
      key.includes('batch') || 
      key.includes('api:') || 
      key.includes('generate') ||
      key === 'test' ||
      key === 'login'
    ).reduce((obj, key) => {
      obj[key] = scripts[key];
      return obj;
    }, {});
    
    res.json(automationScripts);
  } catch (error) {
    res.status(500).json({ error: `Failed to read scripts: ${error.message}` });
  }
});

// Update test files with current configuration (manual trigger)
app.post('/api/config/update-files', (req, res) => {
  try {
    const result = updateTestFilesWithConfig();
    
    if (result.success) {
      res.json({
        message: `Successfully updated ${result.updatedCount}/${result.totalFiles} test files`,
        ...result
      });
    } else {
      res.status(400).json({
        message: `Updated ${result.updatedCount}/${result.totalFiles} files with ${result.errors.length} errors`,
        ...result
      });
    }
  } catch (error) {
    res.status(500).json({ error: `Failed to update test files: ${error.message}` });
  }
});

// Execute NPM script
app.post('/api/execute', (req, res) => {
  const { script } = req.body;
  
  if (!script) {
    return res.status(400).json({ error: 'Script name is required' });
  }
  
  // Update test files with current configuration before execution
  console.log('🔄 Updating test files before script execution...');
  const updateResult = updateTestFilesWithConfig();
  
  if (!updateResult.success) {
    return res.status(400).json({ 
      error: 'Failed to update test files with current configuration',
      updateErrors: updateResult.errors
    });
  }
  
  const processId = Date.now().toString();
  
  try {
    const child = spawn('npm', ['run', script], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      const newData = data.toString();
      output += newData;
      // Update process data immediately for live logs
      const processData = runningProcesses.get(processId);
      if (processData) {
        processData.output = output;
      }
    });
    
    child.stderr.on('data', (data) => {
      const newData = data.toString();
      errorOutput += newData;
      // Update process data immediately for live logs
      const processData = runningProcesses.get(processId);
      if (processData) {
        processData.error = errorOutput;
      }
    });
    
    child.on('close', (code) => {
      const processData = runningProcesses.get(processId);
      if (processData) {
        processData.completed = true;
        processData.exitCode = code;
        processData.output = output;
        processData.error = errorOutput;
      }
    });
    
    runningProcesses.set(processId, {
      process: child,
      script,
      startTime: new Date(),
      completed: false,
      output: output,
      error: errorOutput,
      exitCode: null
    });
    
    res.json({ 
      message: `Script '${script}' started successfully`, 
      processId,
      status: 'running'
    });
    
  } catch (error) {
    res.status(500).json({ error: `Failed to start script: ${error.message}` });
  }
});

// Get process status
app.get('/api/process/:processId', (req, res) => {
  const { processId } = req.params;
  const processData = runningProcesses.get(processId);
  
  if (!processData) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  res.json({
    processId,
    script: processData.script,
    startTime: processData.startTime,
    completed: processData.completed,
    exitCode: processData.exitCode,
    status: processData.completed ? 'completed' : 'running'
  });
});

// Get process logs
app.get('/api/process/:processId/logs', (req, res) => {
  const { processId } = req.params;
  const processData = runningProcesses.get(processId);
  
  if (!processData) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  res.json({
    output: processData.output,
    error: processData.error
  });
});

// Stop process
app.post('/api/process/:processId/stop', (req, res) => {
  const { processId } = req.params;
  const processData = runningProcesses.get(processId);
  
  if (!processData) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  if (!processData.completed) {
    processData.process.kill('SIGTERM');
    processData.completed = true;
    processData.exitCode = -1;
  }
  
  res.json({ message: 'Process stopped successfully' });
});

// Helper function to update test files with current configuration
function updateTestFilesWithConfig() {
  const testFiles = [
    'tests/api-batch1-continuous.spec.js',
    'tests/api-batch2-continuous.spec.js',
    'tests/api-batch3-continuous.spec.js',
    'tests/api-batch4-continuous.spec.js',
    'tests/api-batch5-continuous.spec.js',
    'tests/api-batch6-continuous.spec.js'
  ];
  
  console.log('🔧 Updating test files with current configuration...');
  console.log(`   Username: ${currentConfig.username}`);
  console.log(`   Duration: ${currentConfig.durationMinutes} minutes`);
  
  let updatedCount = 0;
  let errors = [];
  
  testFiles.forEach(testFile => {
    const fullPath = path.join(__dirname, testFile);
    if (existsSync(fullPath)) {
      try {
        let content = readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        // Update configuration values with more robust regex patterns
        content = content.replace(
          /const DURATION_MINUTES = \d+;/g,
          `const DURATION_MINUTES = ${currentConfig.durationMinutes};`
        );
        
        content = content.replace(
          /const username = '[^']*';/g,
          `const username = '${currentConfig.username}';`
        );
        
        content = content.replace(
          /const password = '[^']*';/g,
          `const password = '${currentConfig.password}';`
        );
        
        // Only write if content actually changed
        if (content !== originalContent) {
          writeFileSync(fullPath, content, 'utf8');
          console.log(`   ✅ Updated: ${testFile}`);
          updatedCount++;
          
          // Verify the update was successful
          const verifyContent = readFileSync(fullPath, 'utf8');
          if (!verifyContent.includes(`const username = '${currentConfig.username}';`) ||
              !verifyContent.includes(`const DURATION_MINUTES = ${currentConfig.durationMinutes};`)) {
            throw new Error('Configuration verification failed after update');
          }
        } else {
          console.log(`   ⏭️  Skipped: ${testFile} (no changes needed)`);
        }
      } catch (error) {
        const errorMsg = `Failed to update ${testFile}: ${error.message}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    } else {
      const errorMsg = `File not found: ${testFile}`;
      console.error(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  });
  
  console.log(`📊 Configuration update complete: ${updatedCount}/${testFiles.length} files updated`);
  if (errors.length > 0) {
    console.error(`⚠️  ${errors.length} errors occurred during update`);
  }
  
  return {
    success: errors.length === 0,
    updatedCount,
    totalFiles: testFiles.length,
    errors
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    runningProcesses: runningProcesses.size
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Vodafone Automation Web Interface running on port ${PORT}`);
  console.log(`📊 Access the interface at: http://localhost:${PORT}`);
  console.log(`🔧 For EC2: http://YOUR_EC2_PUBLIC_IP:${PORT}`);
});