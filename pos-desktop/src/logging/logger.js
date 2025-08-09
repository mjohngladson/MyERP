// Production Logging System
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

class Logger {
    constructor() {
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.currentLevel = 'info';
        this.logToFile = true;
        this.logToConsole = false;
        this.logDirectory = path.join(os.homedir(), 'AppData', 'Roaming', 'gili-pos', 'logs');
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
        this.currentLogFile = null;
        this.logStream = null;
        
        this.initialize();
    }

    initialize() {
        try {
            // Create log directory
            if (!fs.existsSync(this.logDirectory)) {
                fs.mkdirSync(this.logDirectory, { recursive: true });
            }

            // Setup log file
            this.setupLogFile();

            // Rotate logs on startup
            this.rotateLogs();

            console.log(`✅ Logger initialized: ${this.currentLogFile}`);

        } catch (error) {
            console.error('❌ Failed to initialize logger:', error);
        }
    }

    setupLogFile() {
        const timestamp = new Date().toISOString().split('T')[0];
        this.currentLogFile = path.join(this.logDirectory, `gili-pos-${timestamp}.log`);
        
        if (this.logStream) {
            this.logStream.end();
        }
        
        this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    }

    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.currentLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const pid = process.pid;
        
        let logEntry = {
            timestamp,
            level: level.toUpperCase(),
            pid,
            message: typeof message === 'string' ? message : util.inspect(message)
        };

        // Add metadata
        if (Object.keys(meta).length > 0) {
            logEntry.meta = meta;
        }

        // Add stack trace for errors
        if (message instanceof Error) {
            logEntry.stack = message.stack;
            logEntry.error = {
                name: message.name,
                message: message.message,
                code: message.code
            };
        }

        return logEntry;
    }

    writeToFile(logEntry) {
        if (!this.logToFile || !this.logStream) return;

        try {
            // Check file size and rotate if needed
            if (this.needsRotation()) {
                this.rotateLogs();
            }

            const logLine = JSON.stringify(logEntry) + '\n';
            this.logStream.write(logLine);

        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    writeToConsole(logEntry) {
        if (!this.logToConsole) return;

        const colorCodes = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[32m'  // Green
        };

        const resetCode = '\x1b[0m';
        const color = colorCodes[logEntry.level] || '';
        
        const timestamp = logEntry.timestamp.slice(11, 19); // HH:MM:SS
        const output = `${color}[${timestamp}] ${logEntry.level}${resetCode} ${logEntry.message}`;
        
        if (logEntry.level === 'ERROR') {
            console.error(output);
            if (logEntry.stack) {
                console.error(logEntry.stack);
            }
        } else {
            console.log(output);
        }
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatMessage(level, message, meta);
        
        this.writeToFile(logEntry);
        this.writeToConsole(logEntry);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Specialized logging methods for retail operations
    transaction(action, details = {}) {
        this.info(`TRANSACTION: ${action}`, {
            type: 'transaction',
            user: details.user_id,
            amount: details.amount,
            payment_method: details.payment_method,
            transaction_id: details.transaction_id,
            items_count: details.items_count
        });
    }

    security(event, details = {}) {
        this.warn(`SECURITY: ${event}`, {
            type: 'security',
            user: details.user_id,
            ip_address: details.ip_address,
            details: details
        });
    }

    hardware(device, event, details = {}) {
        this.info(`HARDWARE: ${device} - ${event}`, {
            type: 'hardware',
            device: device,
            event: event,
            ...details
        });
    }

    sync(operation, status, details = {}) {
        this.info(`SYNC: ${operation} - ${status}`, {
            type: 'sync',
            operation: operation,
            status: status,
            records_count: details.count,
            duration: details.duration,
            errors: details.errors
        });
    }

    performance(metric, value, threshold = null) {
        const level = threshold && value > threshold ? 'warn' : 'info';
        this.log(level, `PERFORMANCE: ${metric} = ${value}${threshold ? ` (threshold: ${threshold})` : ''}`, {
            type: 'performance',
            metric: metric,
            value: value,
            threshold: threshold,
            exceeded: threshold && value > threshold
        });
    }

    audit(user, action, resource, details = {}) {
        this.info(`AUDIT: ${user} - ${action} on ${resource}`, {
            type: 'audit',
            user: user,
            action: action,
            resource: resource,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    needsRotation() {
        if (!this.currentLogFile || !fs.existsSync(this.currentLogFile)) {
            return false;
        }

        try {
            const stats = fs.statSync(this.currentLogFile);
            return stats.size >= this.maxFileSize;
        } catch (error) {
            return false;
        }
    }

    rotateLogs() {
        try {
            const files = fs.readdirSync(this.logDirectory)
                .filter(file => file.startsWith('gili-pos-') && file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDirectory, file),
                    stats: fs.statSync(path.join(this.logDirectory, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime);

            // Keep only the most recent log files
            if (files.length >= this.maxFiles) {
                const filesToDelete = files.slice(this.maxFiles - 1);
                
                for (const file of filesToDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Deleted old log file: ${file.name}`);
                }
            }

            // Setup new log file if current one is too large
            if (this.needsRotation()) {
                this.setupLogFile();
            }

        } catch (error) {
            console.error('Failed to rotate logs:', error);
        }
    }

    // Configuration methods
    setLevel(level) {
        if (this.logLevels[level] !== undefined) {
            this.currentLevel = level;
            this.info(`Log level changed to: ${level}`);
        }
    }

    setConsoleOutput(enabled) {
        this.logToConsole = enabled;
        this.info(`Console logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    setFileOutput(enabled) {
        this.logToFile = enabled;
        this.info(`File logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Log file management
    getLogFiles() {
        try {
            const files = fs.readdirSync(this.logDirectory)
                .filter(file => file.startsWith('gili-pos-') && file.endsWith('.log'))
                .map(file => {
                    const filePath = path.join(this.logDirectory, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    };
                })
                .sort((a, b) => b.modified - a.modified);

            return files;
        } catch (error) {
            this.error('Failed to get log files', { error: error.message });
            return [];
        }
    }

    readLogFile(filename, lines = 100) {
        try {
            const filePath = path.join(this.logDirectory, filename);
            const content = fs.readFileSync(filePath, 'utf8');
            const logLines = content.split('\n')
                .filter(line => line.trim())
                .slice(-lines)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { message: line, level: 'RAW' };
                    }
                });

            return logLines;
        } catch (error) {
            this.error('Failed to read log file', { filename, error: error.message });
            return [];
        }
    }

    // Export logs for support
    exportLogs(outputPath, days = 7) {
        try {
            const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
            const logFiles = this.getLogFiles()
                .filter(file => file.modified >= cutoffDate);

            const exportData = {
                export_timestamp: new Date().toISOString(),
                system_info: {
                    platform: os.platform(),
                    arch: os.arch(),
                    node_version: process.version,
                    app_version: require('../../package.json').version
                },
                log_files: []
            };

            for (const file of logFiles) {
                const logs = this.readLogFile(file.name, 1000);
                exportData.log_files.push({
                    filename: file.name,
                    size: file.size,
                    created: file.created,
                    modified: file.modified,
                    entries: logs
                });
            }

            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
            this.info(`Logs exported to: ${outputPath}`);
            
            return { success: true, path: outputPath, files_count: logFiles.length };

        } catch (error) {
            this.error('Failed to export logs', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // Get logger status and statistics
    getStatus() {
        const stats = {
            initialized: !!this.logStream,
            current_level: this.currentLevel,
            log_to_file: this.logToFile,
            log_to_console: this.logToConsole,
            log_directory: this.logDirectory,
            current_log_file: this.currentLogFile,
            max_file_size: this.maxFileSize,
            max_files: this.maxFiles
        };

        if (this.currentLogFile && fs.existsSync(this.currentLogFile)) {
            try {
                const fileStats = fs.statSync(this.currentLogFile);
                stats.current_file_size = fileStats.size;
                stats.current_file_created = fileStats.birthtime;
            } catch (error) {
                stats.current_file_error = error.message;
            }
        }

        return stats;
    }

    // Cleanup method
    close() {
        if (this.logStream) {
            this.logStream.end();
            this.logStream = null;
        }
        this.info('Logger closed');
    }
}

// Global logger instance
let logger = null;

function getLogger() {
    if (!logger) {
        logger = new Logger();
    }
    return logger;
}

// Export both class and singleton
module.exports = { Logger, getLogger };