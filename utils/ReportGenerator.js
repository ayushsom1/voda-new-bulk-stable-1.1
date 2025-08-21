/**
 * HTML Report Generator for Dual-User Handoff Test Results
 */

export class ReportGenerator {
  constructor() {
    this.timestamp = new Date().toISOString();
  }

  /**
   * Generate HTML report from test results
   * @param {Object} results - Test results object
   * @returns {string} HTML content
   */
  generateHTMLReport(results) {
    const analytics = this.calculateAnalytics(results);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dual-User Handoff Test Report</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🔄 Dual-User Handoff Test Report</h1>
            <p class="timestamp">Generated on: ${new Date(this.timestamp).toLocaleString()}</p>
        </header>

        ${this.generateSummarySection(analytics)}
        ${this.generateChartsSection(analytics)}
        ${this.generateSuccessfulHandoffsTable(results.successful)}
        ${this.generateFailedHandoffsTable(results.failed)}
        ${this.generateDetailedAnalytics(analytics)}
    </div>

    <script>
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  /**
   * Calculate analytics from results
   */
  calculateAnalytics(results) {
    const total = results.totalProcessed;
    const successful = results.successful.length;
    const failed = results.failed.length;
    
    const successRate = total > 0 ? (successful / total * 100) : 0;
    const failureRate = total > 0 ? (failed / total * 100) : 0;
    
    const avgSuccessTime = successful > 0 
      ? results.successful.reduce((sum, r) => sum + r.duration, 0) / successful 
      : 0;
    
    const totalAttempts = {
      user1: results.successful.reduce((sum, r) => sum + r.user1Attempts, 0) + 
             results.failed.reduce((sum, r) => sum + r.user1Attempts, 0),
      user2: results.successful.reduce((sum, r) => sum + r.user2Attempts, 0) + 
             results.failed.reduce((sum, r) => sum + r.user2Attempts, 0)
    };

    // Group failures by error type
    const errorTypes = {};
    results.failed.forEach(failure => {
      const errorType = failure.error;
      if (!errorTypes[errorType]) {
        errorTypes[errorType] = 0;
      }
      errorTypes[errorType]++;
    });

    return {
      total,
      successful,
      failed,
      successRate,
      failureRate,
      avgSuccessTime,
      totalTime: results.totalTime,
      totalAttempts,
      errorTypes
    };
  }

  /**
   * Generate summary section
   */
  generateSummarySection(analytics) {
    return `
        <section class="summary-section">
            <h2>📊 Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card success">
                    <div class="card-header">
                        <h3>✅ Successful Handoffs</h3>
                    </div>
                    <div class="card-value">${analytics.successful}</div>
                    <div class="card-percentage">${analytics.successRate.toFixed(1)}%</div>
                </div>
                
                <div class="summary-card failed">
                    <div class="card-header">
                        <h3>❌ Failed Handoffs</h3>
                    </div>
                    <div class="card-value">${analytics.failed}</div>
                    <div class="card-percentage">${analytics.failureRate.toFixed(1)}%</div>
                </div>
                
                <div class="summary-card total">
                    <div class="card-header">
                        <h3>📱 Total Numbers</h3>
                    </div>
                    <div class="card-value">${analytics.total}</div>
                    <div class="card-percentage">100%</div>
                </div>
                
                <div class="summary-card time">
                    <div class="card-header">
                        <h3>⏱️ Total Time</h3>
                    </div>
                    <div class="card-value">${analytics.totalTime.toFixed(1)}s</div>
                    <div class="card-percentage">Avg: ${analytics.avgSuccessTime.toFixed(1)}s</div>
                </div>
            </div>
        </section>`;
  }

  /**
   * Generate charts section
   */
  generateChartsSection(analytics) {
    return `
        <section class="charts-section">
            <h2>📈 Visual Analytics</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Success Rate</h3>
                    <div class="progress-circle" data-percentage="${analytics.successRate.toFixed(1)}">
                        <div class="progress-text">${analytics.successRate.toFixed(1)}%</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3>Handoff Distribution</h3>
                    <div class="bar-chart">
                        <div class="bar success-bar" style="height: ${analytics.successRate}%">
                            <span class="bar-label">Success<br>${analytics.successful}</span>
                        </div>
                        <div class="bar failed-bar" style="height: ${analytics.failureRate}%">
                            <span class="bar-label">Failed<br>${analytics.failed}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
  }

  /**
   * Generate successful handoffs table
   */
  generateSuccessfulHandoffsTable(successful) {
    if (successful.length === 0) {
      return `
        <section class="table-section">
            <h2>✅ Successful Handoffs</h2>
            <div class="no-data">No successful handoffs recorded</div>
        </section>`;
    }

    const rows = successful.map((result, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="phone-number">${result.phoneNumber}</td>
            <td>${result.user1Attempts}</td>
            <td>${result.user2Attempts}</td>
            <td>${result.duration.toFixed(2)}s</td>
            <td><span class="status-badge success">✅ Success</span></td>
        </tr>
    `).join('');

    return `
        <section class="table-section">
            <h2>✅ Successful Handoffs (${successful.length})</h2>
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Phone Number</th>
                            <th>User 1 Attempts</th>
                            <th>User 2 Attempts</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </section>`;
  }

  /**
   * Generate failed handoffs table
   */
  generateFailedHandoffsTable(failed) {
    if (failed.length === 0) {
      return `
        <section class="table-section">
            <h2>❌ Failed Handoffs</h2>
            <div class="no-data">No failed handoffs recorded</div>
        </section>`;
    }

    const rows = failed.map((result, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="phone-number">${result.phoneNumber}</td>
            <td>${result.user1Attempts}</td>
            <td>${result.user2Attempts}</td>
            <td class="error-cell">${result.error}</td>
            <td><span class="status-badge failed">❌ Failed</span></td>
        </tr>
    `).join('');

    return `
        <section class="table-section">
            <h2>❌ Failed Handoffs (${failed.length})</h2>
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Phone Number</th>
                            <th>User 1 Attempts</th>
                            <th>User 2 Attempts</th>
                            <th>Error Details</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </section>`;
  }

  /**
   * Generate detailed analytics section
   */
  generateDetailedAnalytics(analytics) {
    const errorTypeRows = Object.entries(analytics.errorTypes)
      .map(([error, count]) => {
        const percentage = (count / analytics.failed * 100).toFixed(1);
        return `
          <tr>
            <td>${error}</td>
            <td>${count}</td>
            <td>${percentage}%</td>
          </tr>`;
      }).join('');

    return `
        <section class="analytics-section">
            <h2>🔍 Detailed Analytics</h2>
            
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>👥 User Attempt Statistics</h3>
                    <table class="mini-table">
                        <tr>
                            <td>User 1 Total Attempts:</td>
                            <td><strong>${analytics.totalAttempts.user1}</strong></td>
                        </tr>
                        <tr>
                            <td>User 2 Total Attempts:</td>
                            <td><strong>${analytics.totalAttempts.user2}</strong></td>
                        </tr>
                        <tr>
                            <td>Average Success Time:</td>
                            <td><strong>${analytics.avgSuccessTime.toFixed(2)}s</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="analytics-card">
                    <h3>🐛 Error Analysis</h3>
                    ${analytics.failed > 0 ? `
                    <table class="mini-table">
                        <thead>
                            <tr>
                                <th>Error Type</th>
                                <th>Count</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${errorTypeRows}
                        </tbody>
                    </table>
                    ` : '<div class="no-data">No errors recorded</div>'}
                </div>
            </div>
        </section>`;
  }

  /**
   * Save report to file
   */
  async saveReport(results, filename = null) {
    const fs = await import('fs');
    const path = await import('path');
    
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `dual-user-handoff-report-${timestamp}.html`;
    }
    
    const reportPath = path.resolve('reports', filename);
    const htmlContent = this.generateHTMLReport(results);
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, htmlContent, 'utf8');
    return reportPath;
  }

  /**
   * CSS Styles
   */
  getCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .timestamp {
            opacity: 0.8;
            font-size: 1.1em;
        }
        
        .summary-section, .charts-section, .table-section, .analytics-section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .summary-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border: 3px solid;
        }
        
        .summary-card.success { border-color: #27ae60; }
        .summary-card.failed { border-color: #e74c3c; }
        .summary-card.total { border-color: #3498db; }
        .summary-card.time { border-color: #f39c12; }
        
        .card-value {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .card-percentage {
            font-size: 1.2em;
            opacity: 0.7;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 20px;
        }
        
        .chart-container {
            text-align: center;
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
        }
        
        .progress-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: conic-gradient(#27ae60 0deg, #27ae60 var(--percentage), #e0e0e0 var(--percentage));
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px auto;
            position: relative;
        }
        
        .progress-circle::before {
            content: '';
            position: absolute;
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 50%;
        }
        
        .progress-text {
            position: relative;
            z-index: 1;
            font-size: 1.5em;
            font-weight: bold;
        }
        
        .bar-chart {
            display: flex;
            justify-content: center;
            align-items: end;
            height: 200px;
            gap: 20px;
            margin-top: 20px;
        }
        
        .bar {
            width: 60px;
            min-height: 20px;
            position: relative;
            border-radius: 5px 5px 0 0;
        }
        
        .success-bar { background: #27ae60; }
        .failed-bar { background: #e74c3c; }
        
        .bar-label {
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.9em;
            text-align: center;
        }
        
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .results-table th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .results-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        
        .results-table tr:hover {
            background: #f8f9fa;
        }
        
        .phone-number {
            font-family: monospace;
            font-weight: bold;
        }
        
        .error-cell {
            max-width: 300px;
            word-wrap: break-word;
            font-size: 0.9em;
        }
        
        .status-badge {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-badge.success {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .analytics-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
        }
        
        .mini-table {
            width: 100%;
            margin-top: 15px;
        }
        
        .mini-table td, .mini-table th {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        
        h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        
        h3 {
            color: #34495e;
            margin-bottom: 15px;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 10px;
            }
            
            .header {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .summary-section, .charts-section, .table-section, .analytics-section {
                padding: 20px;
            }
        }
    `;
  }

  /**
   * JavaScript for interactivity
   */
  getJavaScript() {
    return `
        document.addEventListener('DOMContentLoaded', function() {
            // Animate progress circles
            const progressCircles = document.querySelectorAll('.progress-circle');
            progressCircles.forEach(circle => {
                const percentage = parseFloat(circle.dataset.percentage);
                const degrees = (percentage / 100) * 360;
                circle.style.setProperty('--percentage', degrees + 'deg');
            });
            
            // Add hover effects to table rows
            const tableRows = document.querySelectorAll('.results-table tbody tr');
            tableRows.forEach(row => {
                row.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.02)';
                    this.style.transition = 'transform 0.2s ease';
                });
                
                row.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                });
            });
            
            // Animate cards on scroll
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);
            
            const animatedElements = document.querySelectorAll('.summary-card, .chart-container, .analytics-card');
            animatedElements.forEach(element => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(element);
            });
        });
    `;
  }
}