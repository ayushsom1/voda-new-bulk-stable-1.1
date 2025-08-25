import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class HTMLReportGenerator {
  static generateReport(outputPath = 'api-automation-report.html') {
    try {
      // Find all test result JSON files (including cycle-based files)
      const testFiles = readdirSync('.')
        .filter(file => file.match(/^api-batch\d+(-cycle\d+)?-test-.*\.json$/))
        .sort();

      if (testFiles.length === 0) {
        console.log('❌ No test result files found');
        return;
      }

      // Read and parse all test results
      const testResults = testFiles.map(file => {
        try {
          const content = readFileSync(file, 'utf8');
          return JSON.parse(content);
        } catch (error) {
          console.error(`Error reading ${file}:`, error);
          return null;
        }
      }).filter(result => result !== null);

      // Generate HTML report
      const html = this.generateHTML(testResults);
      writeFileSync(outputPath, html);
      
      console.log(`✅ HTML report generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  static generateHTML(testResults) {
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
    
    // Calculate overall statistics
    const overallStats = this.calculateOverallStats(testResults);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Automation Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .summary {
            padding: 30px;
            background: #f8f9fc;
            border-bottom: 1px solid #e9ecef;
        }
        
        .summary h2 {
            color: #495057;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        
        .stat-card h3 {
            font-size: 2.5em;
            margin-bottom: 10px;
            color: #667eea;
        }
        
        .stat-card p {
            color: #6c757d;
            font-weight: 500;
        }
        
        .batch-results {
            padding: 30px;
        }
        
        .batch-card {
            margin-bottom: 30px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .batch-header {
            background: #495057;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .batch-header h3 {
            font-size: 1.3em;
        }
        
        .batch-status {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .status-success { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-error { background: #f8d7da; color: #721c24; }
        
        .batch-body {
            padding: 20px;
        }
        
        .batch-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .mini-stat {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .mini-stat .number {
            font-size: 1.8em;
            font-weight: bold;
            color: #495057;
        }
        
        .mini-stat .label {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 5px;
        }
        
        .action-breakdown {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        .action-tag {
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .action-blocked { background: #d4edda; color: #155724; }
        .action-already { background: #e2e3e5; color: #495057; }
        .action-notfound { background: #cce5ff; color: #0056b3; }
        .action-exceeded { background: #fff3cd; color: #856404; }
        .action-error { background: #f8d7da; color: #721c24; }
        
        .numbers-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .numbers-table th,
        .numbers-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .numbers-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        .numbers-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .number-status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .footer {
            background: #495057;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        
        .collapsible:hover {
            opacity: 0.8;
        }
        
        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        
        .collapsible-content.active {
            max-height: 1000px;
        }
        
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .batch-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .batch-stats {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Successfully Blocked Numbers Report</h1>
            <p>Consolidated Vodafone Number Blocking Success Dashboard • Generated on ${timestamp}</p>
        </div>
        
        <div class="summary">
            <h2>🎉 Consolidated Success Summary</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${overallStats.blockedNumbers}</h3>
                    <p>Total Numbers Successfully Blocked</p>
                </div>
                <div class="stat-card">
                    <h3>${overallStats.totalBatches}</h3>
                    <p>Total Sessions/Cycles</p>
                </div>
                <div class="stat-card">
                    <h3>${overallStats.totalNumbers}</h3>
                    <p>Total Numbers Processed</p>
                </div>
                <div class="stat-card">
                    <h3>${((overallStats.blockedNumbers / overallStats.totalNumbers) * 100).toFixed(1)}%</h3>
                    <p>Overall Block Success Rate</p>
                </div>
                <div class="stat-card">
                    <h3>${overallStats.totalAutomationDuration}s</h3>
                    <p>Total Automation Duration</p>
                </div>
            </div>
        </div>
        
        <div class="batch-results">
            <h2>📋 Batch Results</h2>
            ${testResults.map(result => this.generateBatchHTML(result)).join('')}
        </div>
        
        <div class="footer">
            <p>Generated by API Automation Framework • Vodafone cpos4 Integration</p>
        </div>
    </div>
    
    <script>
        // Toggle collapsible sections
        document.querySelectorAll('.collapsible').forEach(item => {
            item.addEventListener('click', () => {
                const content = item.nextElementSibling;
                content.classList.toggle('active');
            });
        });
        
        // Auto-expand first batch
        document.querySelector('.collapsible-content')?.classList.add('active');
    </script>
</body>
</html>`;
  }

  static calculateOverallStats(testResults) {
    const stats = testResults.reduce((stats, result) => {
      stats.totalBatches += 1;
      stats.totalNumbers += result.summary.totalProcessed;
      stats.successfulOperations += result.summary.successCount;
      stats.blockedNumbers += result.summary.actionSummary.blocked;
      stats.failedOperations += result.summary.failureCount;
      
      // Track earliest start time and latest end time for total automation time span
      const testDate = new Date(result.testDate).getTime();
      if (!stats.earliestStart || testDate < stats.earliestStart) {
        stats.earliestStart = testDate;
      }
      if (!stats.latestEnd || testDate > stats.latestEnd) {
        stats.latestEnd = testDate;
      }
      
      return stats;
    }, {
      totalBatches: 0,
      totalNumbers: 0,
      successfulOperations: 0,
      blockedNumbers: 0,
      failedOperations: 0,
      earliestStart: null,
      latestEnd: null
    });
    
    // Calculate total automation time span (from first batch start to last batch start)
    if (stats.earliestStart && stats.latestEnd) {
      stats.totalAutomationDuration = ((stats.latestEnd - stats.earliestStart) / 1000).toFixed(2);
    } else {
      stats.totalAutomationDuration = '0.00';
    }
    
    return stats;
  }

  static generateBatchHTML(result) {
    const batchNumber = result.testName.match(/Batch (\d+)/)?.[1] || result.testName.match(/Cycle (\d+)/)?.[1] || 'Unknown';
    const blockedCount = result.summary.actionSummary.blocked;
    const blockedNumbers = result.results.blockOperations.filter(op => op.action === 'blocked');
    const totalProcessed = result.summary.totalProcessed;
    
    // Only show batches that have successfully blocked numbers
    if (blockedCount === 0) {
      return `
        <div class="batch-card" style="opacity: 0.6; border-left: 3px solid #ccc;">
            <div class="batch-header">
                <h3>📦 ${result.testName} - ${result.phoneNumberFile}</h3>
                <div class="batch-status" style="background: #f8f9fa; color: #6c757d;">
                    No numbers blocked (${totalProcessed} processed)
                </div>
            </div>
        </div>`;
    }
    
    return `
        <div class="batch-card" style="border-left: 4px solid #28a745;">
            <div class="batch-header collapsible">
                <h3>🎉 ${result.testName} - ${result.phoneNumberFile}</h3>
                <div class="batch-status status-success">
                    ${blockedCount} Successfully Blocked
                </div>
            </div>
            <div class="collapsible-content">
                <div class="batch-body">
                    <div class="batch-stats">
                        <div class="mini-stat" style="background: #d4edda; border: 1px solid #c3e6cb;">
                            <div class="number" style="color: #155724;">${blockedCount}</div>
                            <div class="label">Successfully Blocked</div>
                        </div>
                        <div class="mini-stat">
                            <div class="number">${totalProcessed}</div>
                            <div class="label">Total Processed</div>
                        </div>
                        <div class="mini-stat">
                            <div class="number">${((blockedCount / totalProcessed) * 100).toFixed(1)}%</div>
                            <div class="label">Block Success Rate</div>
                        </div>
                    </div>
                    
                    <div class="action-breakdown">
                        <div class="action-tag action-blocked" style="background: #d4edda; color: #155724; font-weight: bold;">
                            🎉 ${blockedCount} Numbers Successfully Blocked
                        </div>
                    </div>
                    
                    <table class="numbers-table">
                        <thead>
                            <tr>
                                <th>🎉 Successfully Blocked Numbers</th>
                                <th>Timestamp</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${blockedNumbers.map(op => `
                                <tr style="background: #f8fff8; border-left: 3px solid #28a745;">
                                    <td style="font-weight: bold; color: #155724;">📞 ${op.phoneNumber}</td>
                                    <td>${new Date(op.timestamp).toLocaleString()}</td>
                                    <td style="color: #155724;">✅ ${op.message}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
  }

  static getActionIcon(action) {
    const icons = {
      'blocked': '🎉',
      'already_blocked': 'ℹ️',
      'no_records': '📋',
      'exceeded_limit': '⚠️',
      'error': '❌'
    };
    return icons[action] || '❓';
  }
}