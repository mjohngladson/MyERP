// Production Error Handling & Crash Reporting
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { app } = require('electron');

class CrashReporter {
    constructor() {
        this.errorLogPath = path.join(os.homedir(), 'AppData', 'Roaming', 'gili-pos', 'crashes');
        this.maxCrashFiles = 10;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create crash directory
            await fs.mkdir(this.errorLogPath, { recursive: true });

            // Setup global error handlers
            this.setupGlobalHandlers();

            // Setup Electron crash reporter
            this.setupElectronCrashReporter();

            // Clean old crash files
            await this.cleanOldCrashFiles();

            this.isInitialized = true;
            console.log('✅ Crash reporter initialized');

        } catch (error) {
            console.error('❌ Failed to initialize crash reporter:', error);
        }
    }

    setupGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            await this.reportCrash(error, 'uncaughtException');
            
            // Give time for crash report to be written
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            const error = new Error(`Unhandled Promise Rejection: ${reason}`);
            console.error('💥 Unhandled Rejection:', error);
            await this.reportCrash(error, 'unhandledRejection', { promise });
        });

        // Handle warning events
        process.on('warning', (warning) => {
            console.warn('⚠️ Process Warning:', warning);
            this.reportWarning(warning);
        });
    }

    setupElectronCrashReporter() {
        try {
            const { crashReporter } = require('electron');
            
            crashReporter.start({
                productName: 'GiLi PoS',
                companyName: 'GiLi',
                submitURL: '', // No external reporting in offline-first app
                uploadToServer: false,
                extra: {
                    version: app.getVersion(),
                    platform: os.platform(),
                    arch: os.arch()
                }
            });

        } catch (error) {
            console.warn('⚠️ Could not setup Electron crash reporter:', error);
        }
    }

    async reportCrash(error, type = 'error', context = {}) {
        try {
            const crashId = this.generateCrashId();
            const timestamp = new Date().toISOString();

            const crashReport = {
                id: crashId,
                timestamp: timestamp,
                type: type,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                },
                system: {
                    platform: os.platform(),
                    arch: os.arch(),
                    release: os.release(),
                    memory: process.memoryUsage(),
                    uptime: process.uptime(),
                    pid: process.pid
                },
                application: {
                    name: 'GiLi PoS',
                    version: app ? app.getVersion() : '1.0.0',
                    node_version: process.version,
                    electron_version: process.versions.electron
                },
                context: context,
                environment_variables: {
                    NODE_ENV: process.env.NODE_ENV,
                    // Don't include sensitive environment variables
                }
            };

            // Write crash report to file
            const crashFilePath = path.join(this.errorLogPath, `crash_${crashId}.json`);
            await fs.writeFile(crashFilePath, JSON.stringify(crashReport, null, 2));

            // Also create a human-readable summary
            const summaryPath = path.join(this.errorLogPath, `crash_${crashId}.txt`);
            await this.createHumanReadableCrashReport(crashReport, summaryPath);

            console.log(`💾 Crash report saved: ${crashFilePath}`);

            // Try to log to database if available
            await this.logCrashToDatabase(crashReport);

            return crashId;

        } catch (reportError) {
            console.error('❌ Failed to write crash report:', reportError);
            // Fallback: write to console
            console.error('💥 CRASH DETAILS:', {
                error: error.toString(),
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createHumanReadableCrashReport(crashReport, outputPath) {
        const lines = [
            '=== GiLi PoS CRASH REPORT ===',
            '',
            `Crash ID: ${crashReport.id}`,
            `Date: ${crashReport.timestamp}`,
            `Type: ${crashReport.type}`,
            '',
            '--- ERROR DETAILS ---',
            `Name: ${crashReport.error.name}`,
            `Message: ${crashReport.error.message}`,
            '',
            'Stack Trace:',
            crashReport.error.stack || 'No stack trace available',
            '',
            '--- SYSTEM INFORMATION ---',
            `Platform: ${crashReport.system.platform}`,
            `Architecture: ${crashReport.system.arch}`,
            `OS Release: ${crashReport.system.release}`,
            `Process ID: ${crashReport.system.pid}`,
            `Uptime: ${Math.floor(crashReport.system.uptime)}s`,
            '',
            '--- APPLICATION INFORMATION ---',
            `Name: ${crashReport.application.name}`,
            `Version: ${crashReport.application.version}`,
            `Node.js: ${crashReport.application.node_version}`,
            `Electron: ${crashReport.application.electron_version || 'N/A'}`,
            '',
            '--- MEMORY USAGE ---',
            `RSS: ${Math.round(crashReport.system.memory.rss / 1024 / 1024)}MB`,
            `Heap Used: ${Math.round(crashReport.system.memory.heapUsed / 1024 / 1024)}MB`,
            `Heap Total: ${Math.round(crashReport.system.memory.heapTotal / 1024 / 1024)}MB`,
            `External: ${Math.round(crashReport.system.memory.external / 1024 / 1024)}MB`,
            '',
            '--- CONTEXT ---',
            JSON.stringify(crashReport.context, null, 2),
            '',
            '=== END CRASH REPORT ===',
            ''
        ];

        await fs.writeFile(outputPath, lines.join('\n'));
    }

    async reportWarning(warning) {
        try {
            const warningId = this.generateCrashId();
            const timestamp = new Date().toISOString();

            const warningReport = {
                id: warningId,
                timestamp: timestamp,
                type: 'warning',
                warning: {
                    name: warning.name,
                    message: warning.message,
                    code: warning.code
                },
                system: {
                    platform: os.platform(),
                    memory: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };

            const warningFilePath = path.join(this.errorLogPath, `warning_${warningId}.json`);
            await fs.writeFile(warningFilePath, JSON.stringify(warningReport, null, 2));

        } catch (error) {
            console.error('❌ Failed to write warning report:', error);
        }
    }

    async logCrashToDatabase(crashReport) {
        try {
            const { getDatabase } = require('../database/sqlite');
            const db = getDatabase();

            if (db) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO audit_log (user_id, action, resource, details)
                        VALUES (?, ?, ?, ?)
                    `, [
                        null,
                        'application_crash',
                        'system',
                        JSON.stringify({
                            crash_id: crashReport.id,
                            error_type: crashReport.type,
                            error_name: crashReport.error.name,
                            error_message: crashReport.error.message
                        })
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } catch (error) {
            // Don't throw errors from crash logging
            console.warn('⚠️ Could not log crash to database:', error);
        }
    }

    async cleanOldCrashFiles() {
        try {
            const files = await fs.readdir(this.errorLogPath);
            const crashFiles = files
                .filter(file => file.startsWith('crash_') || file.startsWith('warning_'))
                .map(file => ({
                    name: file,
                    path: path.join(this.errorLogPath, file),
                    created: this.extractTimestampFromFile(file)
                }))
                .sort((a, b) => b.created - a.created);

            // Keep only the most recent crash files
            if (crashFiles.length > this.maxCrashFiles) {
                const filesToDelete = crashFiles.slice(this.maxCrashFiles);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                }

                console.log(`🗑️ Cleaned ${filesToDelete.length} old crash files`);
            }

        } catch (error) {
            console.warn('⚠️ Could not clean old crash files:', error);
        }
    }

    extractTimestampFromFile(filename) {
        try {
            // Try to get file modification time as fallback
            const stats = require('fs').statSync(path.join(this.errorLogPath, filename));
            return stats.mtime;
        } catch {
            return new Date(0);
        }
    }

    generateCrashId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${timestamp}_${random}`;
    }

    async getCrashReports(limit = 10) {
        try {
            const files = await fs.readdir(this.errorLogPath);
            const crashFiles = files
                .filter(file => file.endsWith('.json') && (file.startsWith('crash_') || file.startsWith('warning_')))
                .sort()
                .reverse()
                .slice(0, limit);

            const reports = [];
            
            for (const file of crashFiles) {
                try {
                    const filePath = path.join(this.errorLogPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const report = JSON.parse(content);
                    reports.push(report);
                } catch (error) {
                    console.warn(`Could not read crash file ${file}:`, error);
                }
            }

            return reports;

        } catch (error) {
            console.error('❌ Failed to get crash reports:', error);
            return [];
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            crash_directory: this.errorLogPath,
            max_crash_files: this.maxCrashFiles
        };
    }

    // For manual error reporting
    reportError(error, context = {}) {
        return this.reportCrash(error, 'manual', context);
    }

    // For performance monitoring
    reportPerformanceIssue(metric, value, threshold, context = {}) {
        const error = new Error(`Performance issue: ${metric} (${value}) exceeded threshold (${threshold})`);
        return this.reportCrash(error, 'performance', { 
            metric, 
            value, 
            threshold, 
            ...context 
        });
    }
}

// Global instance
let crashReporter = null;

function getCrashReporter() {
    if (!crashReporter) {
        crashReporter = new CrashReporter();
    }
    return crashReporter;
}

module.exports = { CrashReporter, getCrashReporter };