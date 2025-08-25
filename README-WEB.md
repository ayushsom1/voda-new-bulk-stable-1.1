# Vodafone Automation Web Interface

A web-based control panel for managing and executing Vodafone phone number blocking automation.

## Features

- **Configuration Management**: Easy setup of credentials and duration
- **Batch Management**: Upload, edit, and manage phone number batches
- **Script Execution**: Run automation scripts with real-time monitoring
- **Process Monitoring**: Track running processes with live logs
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers (if not already done)

```bash
npm run install:browsers
```

### 3. Start the Web Server

```bash
npm run web
# or
npm start
```

The web interface will be available at:
- Local: http://localhost:3000
- EC2/Server: http://YOUR_SERVER_IP:3000

## Using the Web Interface

### Configuration Section
- **Username**: Your Vodafone cpos4 username
- **Password**: Your Vodafone cpos4 password  
- **Duration**: How long to run continuous automation (in minutes)

### Phone Number Batches
- **Edit Batches**: Click on batch tabs (1-6) to edit phone numbers
- **Upload Files**: Upload .txt or .csv files with phone numbers
- **Auto-Save**: Changes are automatically saved when you click "Save"

### Execute Scripts
Available automation commands:
- **batch:continuous:all**: Run all active batches and generate consolidated report
- **batch1:continuous** through **batch4:continuous**: Run individual batches
- **login**: Test authentication
- **generate:report**: Create HTML reports
- **api:automation**: Run API automation tests

### Process Monitoring
- Real-time process status updates
- Live log viewing with toggle functionality
- Stop running processes if needed

## EC2/Server Deployment

### 1. Security Group Settings
Open port 3000 in your EC2 security group:
```
Type: Custom TCP
Port Range: 3000
Source: 0.0.0.0/0 (or restrict to your IP range)
```

### 2. Install Node.js (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install System Dependencies
```bash
# For Playwright browsers
sudo apt-get update
sudo apt-get install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-dev \
    libgbm-dev \
    libasound2-dev
```

### 4. Clone and Setup Project
```bash
# Upload your project files to EC2
cd /path/to/your/project
npm install
npm run install:browsers
```

### 5. Run as Background Service
```bash
# Using PM2 (recommended)
sudo npm install -g pm2
pm2 start web-server.js --name "vodafone-automation"
pm2 startup
pm2 save

# Or using nohup
nohup npm run web > automation.log 2>&1 &
```

### 6. Access the Interface
Open your browser and navigate to:
```
http://YOUR_EC2_PUBLIC_IP:3000
```

## API Endpoints

The web interface uses these REST API endpoints:

- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `GET /api/batches/:number` - Get batch file contents
- `POST /api/batches/:number` - Update batch file
- `POST /api/batches/:number/upload` - Upload batch file
- `GET /api/scripts` - Get available NPM scripts
- `POST /api/execute` - Execute a script
- `GET /api/process/:id` - Get process status
- `GET /api/process/:id/logs` - Get process logs
- `POST /api/process/:id/stop` - Stop a process

## Environment Variables

Set these environment variables for customization:

```bash
PORT=3000                    # Web server port (default: 3000)
NODE_ENV=production         # Environment mode
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process using port 3000
sudo lsof -t -i:3000 | xargs kill -9
```

### Permission Issues
```bash
# Fix file permissions
chmod +x web-server.js
chown -R $USER:$USER /path/to/project
```

### Browser Installation Issues
```bash
# Manual browser installation
npx playwright install
npx playwright install-deps
```

### Logs and Debugging
```bash
# Check PM2 logs
pm2 logs vodafone-automation

# Check system logs
tail -f automation.log
```

## Security Considerations

- **Firewall**: Restrict port 3000 to trusted IP addresses
- **HTTPS**: Use a reverse proxy (nginx) with SSL for production
- **Authentication**: Consider adding basic auth for additional security
- **Updates**: Keep dependencies updated regularly

## Development

To modify the interface:

1. **Backend**: Edit `web-server.js` for API changes
2. **Frontend**: Edit `public/index.html` for UI changes
3. **Restart**: Run `npm run web` to apply changes

The server automatically serves static files from the `public/` directory.