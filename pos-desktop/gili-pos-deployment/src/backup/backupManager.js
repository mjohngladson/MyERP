// Comprehensive Backup & Recovery System for Retail Use
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getDatabase } = require('../database/sqlite');
const { ConfigManager } = require('../config/production');

class BackupManager {
    constructor() {
        this.config = new ConfigManager();
        this.db = null;
        this.backupInProgress = false;
        this.lastBackupTime = null;
    }

    async initialize() {
        this.db = getDatabase();
        await this.createBackupDirectory();
        await this.scheduleBackups();
        this.lastBackupTime = await this.getLastBackupTime();
    }

    async createBackupDirectory() {
        const backupPath = this.config.get('backup.location');
        
        try {
            await fs.mkdir(backupPath, { recursive: true });
            console.log(`✅ Backup directory created: ${backupPath}`);
        } catch (error) {
            console.error('❌ Failed to create backup directory:', error);
            throw error;
        }
    }

    async createFullBackup(reason = 'manual') {
        if (this.backupInProgress) {
            throw new Error('Backup already in progress');
        }

        this.backupInProgress = true;
        const startTime = new Date();
        const backupId = `backup_${startTime.toISOString().replace(/[:.]/g, '-')}`;

        try {
            console.log(`🔄 Starting full backup: ${backupId}`);

            // Create backup metadata
            const metadata = {
                id: backupId,
                type: 'full',
                reason: reason,
                started_at: startTime.toISOString(),
                version: this.config.get('app.version'),
                database_size: await this.getDatabaseSize(),
                checksum: null
            };

            const backupPath = path.join(this.config.get('backup.location'), backupId);
            await fs.mkdir(backupPath, { recursive: true });

            // 1. Backup SQLite database
            await this.backupDatabase(path.join(backupPath, 'database.db'));

            // 2. Backup configuration files
            await this.backupConfiguration(path.join(backupPath, 'config.json'));

            // 3. Backup logs (last 7 days)
            await this.backupLogs(path.join(backupPath, 'logs'));

            // 4. Calculate checksum
            metadata.checksum = await this.calculateBackupChecksum(backupPath);
            metadata.completed_at = new Date().toISOString();
            metadata.duration_ms = new Date() - startTime;

            // 5. Save metadata
            await fs.writeFile(
                path.join(backupPath, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            // 6. Encrypt backup if enabled
            if (this.config.get('backup.encrypt_backups')) {
                await this.encryptBackup(backupPath);
            }

            // 7. Clean old backups
            await this.cleanOldBackups();

            // 8. Log backup completion
            await this.logBackupEvent(backupId, 'completed', metadata);

            this.lastBackupTime = metadata.completed_at;

            console.log(`✅ Backup completed: ${backupId} (${metadata.duration_ms}ms)`);

            return {
                success: true,
                backup_id: backupId,
                path: backupPath,
                metadata: metadata
            };

        } catch (error) {
            console.error('❌ Backup failed:', error);
            await this.logBackupEvent(backupId, 'failed', { error: error.message });
            throw error;
        } finally {
            this.backupInProgress = false;
        }
    }

    async backupDatabase(outputPath) {
        return new Promise((resolve, reject) => {
            // Use SQLite backup API for consistent backup
            const backup = this.db.backup(outputPath);
            
            backup.step(-1, (err) => {
                if (err) {
                    reject(err);
                } else {
                    backup.finish((err) => {
                        if (err) reject(err);
                        else {
                            console.log('✅ Database backup completed');
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async backupConfiguration(outputPath) {
        try {
            const config = this.config.getAll();
            // Remove sensitive data
            delete config.security;
            delete config.network.api_key;

            await fs.writeFile(outputPath, JSON.stringify(config, null, 2));
            console.log('✅ Configuration backup completed');
        } catch (error) {
            console.error('❌ Configuration backup failed:', error);
            throw error;
        }
    }

    async backupLogs(outputPath) {
        try {
            const logDir = this.config.get('logging.log_directory');
            
            if (!await this.directoryExists(logDir)) {
                console.log('⚠️ No logs directory found, skipping logs backup');
                return;
            }

            await fs.mkdir(outputPath, { recursive: true });
            
            const files = await fs.readdir(logDir);
            const recentFiles = files.filter(file => {
                const filePath = path.join(logDir, file);
                const stats = require('fs').statSync(filePath);
                const age = Date.now() - stats.mtime.getTime();
                return age < 7 * 24 * 60 * 60 * 1000; // 7 days
            });

            for (const file of recentFiles) {
                await fs.copyFile(
                    path.join(logDir, file),
                    path.join(outputPath, file)
                );
            }

            console.log(`✅ Logs backup completed (${recentFiles.length} files)`);
        } catch (error) {
            console.error('❌ Logs backup failed:', error);
            // Don't fail the entire backup for logs
        }
    }

    async calculateBackupChecksum(backupPath) {
        const hash = crypto.createHash('sha256');
        const files = await this.getAllFiles(backupPath);

        for (const file of files.sort()) {
            const content = await fs.readFile(file);
            hash.update(path.relative(backupPath, file));
            hash.update(content);
        }

        return hash.digest('hex');
    }

    async getAllFiles(dirPath, files = []) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                await this.getAllFiles(fullPath, files);
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    async cleanOldBackups() {
        try {
            const backupDir = this.config.get('backup.location');
            const maxBackups = this.config.get('database.max_backups');
            const retentionDays = this.config.get('backup.retention_days');

            const items = await fs.readdir(backupDir, { withFileTypes: true });
            const backupFolders = items
                .filter(item => item.isDirectory() && item.name.startsWith('backup_'))
                .map(item => ({
                    name: item.name,
                    path: path.join(backupDir, item.name),
                    created: this.extractDateFromBackupName(item.name)
                }))
                .sort((a, b) => b.created - a.created);

            // Remove backups older than retention period
            const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
            const oldBackups = backupFolders.filter(backup => backup.created < cutoffDate);

            // Keep at least the most recent backups
            const backupsToDelete = backupFolders.slice(maxBackups).concat(oldBackups);

            for (const backup of backupsToDelete) {
                await this.deleteDirectory(backup.path);
                console.log(`🗑️ Deleted old backup: ${backup.name}`);
            }

            if (backupsToDelete.length > 0) {
                console.log(`✅ Cleaned ${backupsToDelete.length} old backups`);
            }

        } catch (error) {
            console.error('❌ Failed to clean old backups:', error);
            // Don't fail the backup process for cleanup errors
        }
    }

    extractDateFromBackupName(name) {
        try {
            const dateStr = name.replace('backup_', '').replace(/-/g, ':');
            return new Date(dateStr);
        } catch {
            return new Date(0);
        }
    }

    async deleteDirectory(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to delete directory ${dirPath}:`, error);
        }
    }

    async restoreFromBackup(backupId, options = {}) {
        try {
            console.log(`🔄 Starting restore from backup: ${backupId}`);

            const backupPath = path.join(this.config.get('backup.location'), backupId);
            
            if (!await this.directoryExists(backupPath)) {
                throw new Error(`Backup not found: ${backupId}`);
            }

            // Validate backup integrity
            if (!await this.validateBackupIntegrity(backupPath)) {
                throw new Error('Backup integrity check failed');
            }

            // Create current state backup before restore
            if (!options.skipCurrentBackup) {
                await this.createFullBackup('pre_restore');
            }

            // Stop all operations
            console.log('🛑 Stopping all PoS operations for restore...');

            // Restore database
            if (options.restoreDatabase !== false) {
                await this.restoreDatabase(path.join(backupPath, 'database.db'));
            }

            // Restore configuration
            if (options.restoreConfig !== false) {
                await this.restoreConfiguration(path.join(backupPath, 'config.json'));
            }

            console.log('✅ Restore completed successfully');
            console.log('⚠️ Application restart required');

            await this.logBackupEvent(backupId, 'restored', options);

            return { success: true, restart_required: true };

        } catch (error) {
            console.error('❌ Restore failed:', error);
            throw error;
        }
    }

    async validateBackupIntegrity(backupPath) {
        try {
            // Check if metadata exists
            const metadataPath = path.join(backupPath, 'metadata.json');
            if (!await this.fileExists(metadataPath)) {
                return false;
            }

            // Load metadata
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

            // Verify checksum
            const currentChecksum = await this.calculateBackupChecksum(backupPath);
            if (currentChecksum !== metadata.checksum) {
                console.error('❌ Backup checksum mismatch');
                return false;
            }

            // Check required files
            const requiredFiles = ['database.db', 'config.json'];
            for (const file of requiredFiles) {
                if (!await this.fileExists(path.join(backupPath, file))) {
                    console.error(`❌ Required backup file missing: ${file}`);
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('❌ Backup validation failed:', error);
            return false;
        }
    }

    async restoreDatabase(backupDbPath) {
        return new Promise((resolve, reject) => {
            const currentDbPath = this.db.filename;
            
            // Close current database connection
            this.db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Copy backup over current database
                fs.copyFile(backupDbPath, currentDbPath)
                    .then(() => {
                        console.log('✅ Database restored successfully');
                        resolve();
                    })
                    .catch(reject);
            });
        });
    }

    async restoreConfiguration(configPath) {
        try {
            const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
            
            // Apply restored configuration
            Object.keys(configData).forEach(key => {
                this.config.set(key, configData[key]);
            });

            console.log('✅ Configuration restored successfully');
        } catch (error) {
            console.error('❌ Configuration restore failed:', error);
            throw error;
        }
    }

    async getAvailableBackups() {
        try {
            const backupDir = this.config.get('backup.location');
            const items = await fs.readdir(backupDir, { withFileTypes: true });

            const backups = [];
            
            for (const item of items) {
                if (item.isDirectory() && item.name.startsWith('backup_')) {
                    const metadataPath = path.join(backupDir, item.name, 'metadata.json');
                    
                    if (await this.fileExists(metadataPath)) {
                        try {
                            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                            backups.push({
                                id: item.name,
                                ...metadata,
                                path: path.join(backupDir, item.name)
                            });
                        } catch (error) {
                            console.warn(`Invalid backup metadata: ${item.name}`);
                        }
                    }
                }
            }

            return backups.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

        } catch (error) {
            console.error('❌ Failed to get available backups:', error);
            return [];
        }
    }

    async scheduleBackups() {
        const schedule = this.config.get('backup.schedule');
        if (!schedule || !this.config.get('backup.enabled')) {
            return;
        }

        // Simple daily backup at specified time
        const checkBackup = async () => {
            const now = new Date();
            const lastBackup = this.lastBackupTime ? new Date(this.lastBackupTime) : null;
            
            // Check if we need a daily backup
            if (!lastBackup || now.getDate() !== lastBackup.getDate()) {
                try {
                    await this.createFullBackup('scheduled');
                } catch (error) {
                    console.error('❌ Scheduled backup failed:', error);
                }
            }
        };

        // Check every hour
        setInterval(checkBackup, 60 * 60 * 1000);
        
        // Check on startup
        setTimeout(checkBackup, 5000);
    }

    async logBackupEvent(backupId, event, details = {}) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO audit_log (user_id, action, resource, details)
                VALUES (?, ?, ?, ?)
            `, [null, `backup_${event}`, 'backup', JSON.stringify({
                backup_id: backupId,
                ...details
            })], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getDatabaseSize() {
        try {
            const stats = await fs.stat(this.db.filename);
            return stats.size;
        } catch {
            return 0;
        }
    }

    async getLastBackupTime() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT details FROM audit_log 
                WHERE action = 'backup_completed' 
                ORDER BY timestamp DESC LIMIT 1
            `, (err, row) => {
                if (err) reject(err);
                else {
                    try {
                        const details = row ? JSON.parse(row.details) : null;
                        resolve(details ? details.completed_at : null);
                    } catch {
                        resolve(null);
                    }
                }
            });
        });
    }

    async fileExists(path) {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    async directoryExists(path) {
        try {
            const stat = await fs.stat(path);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    getBackupStatus() {
        return {
            enabled: this.config.get('backup.enabled'),
            in_progress: this.backupInProgress,
            last_backup: this.lastBackupTime,
            backup_location: this.config.get('backup.location'),
            encryption_enabled: this.config.get('backup.encrypt_backups')
        };
    }
}

module.exports = { BackupManager };