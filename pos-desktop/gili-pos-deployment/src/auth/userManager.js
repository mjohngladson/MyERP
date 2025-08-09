// User Authentication & Authorization for Retail Use
const crypto = require('crypto');
const { getDatabase } = require('../database/sqlite');

class UserManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
        this.maxFailedAttempts = 3;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.db = null;
    }

    async initialize() {
        this.db = getDatabase();
        await this.createUserTables();
        await this.createDefaultAdmin();
    }

    async createUserTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cashier',
                full_name TEXT NOT NULL,
                phone TEXT,
                active BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT,
                failed_attempts INTEGER DEFAULT 0,
                locked_until TEXT
            )`,
            
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT NOT NULL,
                resource TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                permission TEXT NOT NULL,
                granted BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const tableSQL of tables) {
            await new Promise((resolve, reject) => {
                this.db.run(tableSQL, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)'
        ];

        for (const indexSQL of indexes) {
            await new Promise((resolve, reject) => {
                this.db.run(indexSQL, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Insert default permissions
        await this.insertDefaultPermissions();
    }

    async insertDefaultPermissions() {
        const permissions = [
            // Admin permissions
            { role: 'admin', permission: 'pos:all' },
            { role: 'admin', permission: 'users:manage' },
            { role: 'admin', permission: 'settings:manage' },
            { role: 'admin', permission: 'reports:view_all' },
            { role: 'admin', permission: 'products:manage' },
            { role: 'admin', permission: 'customers:manage' },
            { role: 'admin', permission: 'transactions:refund' },
            { role: 'admin', permission: 'cash:manage' },
            
            // Manager permissions
            { role: 'manager', permission: 'pos:all' },
            { role: 'manager', permission: 'reports:view_store' },
            { role: 'manager', permission: 'products:edit' },
            { role: 'manager', permission: 'customers:manage' },
            { role: 'manager', permission: 'transactions:refund' },
            { role: 'manager', permission: 'cash:count' },
            
            // Cashier permissions
            { role: 'cashier', permission: 'pos:sell' },
            { role: 'cashier', permission: 'pos:return' },
            { role: 'cashier', permission: 'customers:view' },
            { role: 'cashier', permission: 'products:view' },
            { role: 'cashier', permission: 'reports:view_own' }
        ];

        for (const perm of permissions) {
            await new Promise((resolve) => {
                this.db.run(
                    'INSERT OR IGNORE INTO permissions (role, permission) VALUES (?, ?)',
                    [perm.role, perm.permission],
                    () => resolve()
                );
            });
        }
    }

    async createDefaultAdmin() {
        // Check if admin already exists
        const existingAdmin = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id FROM users WHERE role = ? LIMIT 1',
                ['admin'],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingAdmin) return;

        // Create default admin user
        const defaultPassword = 'Admin123!';
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = this.hashPassword(defaultPassword, salt);

        await new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO users (id, username, password_hash, salt, role, full_name, email, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'admin_001',
                'admin',
                passwordHash,
                salt,
                'admin',
                'System Administrator',
                'admin@gili.com',
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('🔑 Default admin created: username=admin, password=Admin123!');
        console.log('⚠️  SECURITY: Change default password immediately in production!');
    }

    hashPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    }

    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    async login(username, password, options = {}) {
        try {
            // Check for user
            const user = await this.getUserByUsername(username);
            
            if (!user) {
                await this.logAudit(null, 'login_failed', 'authentication', 
                    `Failed login attempt for username: ${username}`, options.ip);
                throw new Error('Invalid username or password');
            }

            // Check if user is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                await this.logAudit(user.id, 'login_blocked', 'authentication', 
                    'Login blocked due to lockout', options.ip);
                throw new Error('Account temporarily locked. Please try again later.');
            }

            // Check if user is active
            if (!user.active) {
                await this.logAudit(user.id, 'login_blocked', 'authentication', 
                    'Login blocked - user inactive', options.ip);
                throw new Error('Account is disabled');
            }

            // Verify password
            const passwordHash = this.hashPassword(password, user.salt);
            
            if (passwordHash !== user.password_hash) {
                await this.handleFailedLogin(user.id, options.ip);
                throw new Error('Invalid username or password');
            }

            // Reset failed attempts on successful login
            await this.resetFailedAttempts(user.id);

            // Create session
            const session = await this.createSession(user.id, options);

            // Update last login
            await this.updateLastLogin(user.id);

            // Log successful login
            await this.logAudit(user.id, 'login_success', 'authentication', 
                'User logged in successfully', options.ip);

            this.currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                session_token: session.token
            };

            return {
                success: true,
                user: this.currentUser,
                session: session
            };

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async handleFailedLogin(userId, ipAddress) {
        await new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?',
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Check if should lock account
        const user = await this.getUserById(userId);
        
        if (user.failed_attempts >= this.maxFailedAttempts) {
            const lockUntil = new Date(Date.now() + this.lockoutDuration).toISOString();
            
            await new Promise((resolve, reject) => {
                this.db.run(
                    'UPDATE users SET locked_until = ? WHERE id = ?',
                    [lockUntil, userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            await this.logAudit(userId, 'account_locked', 'security', 
                `Account locked after ${this.maxFailedAttempts} failed attempts`, ipAddress);
        }

        await this.logAudit(userId, 'login_failed', 'authentication', 
            'Invalid password attempt', ipAddress);
    }

    async resetFailedAttempts(userId) {
        await new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async createSession(userId, options = {}) {
        const token = this.generateToken();
        const expiresAt = new Date(Date.now() + this.sessionTimeout).toISOString();

        const sessionId = crypto.randomUUID();

        await new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO user_sessions (id, user_id, token, expires_at)
                VALUES (?, ?, ?, ?)
            `, [sessionId, userId, token, expiresAt], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        return {
            id: sessionId,
            token: token,
            expires_at: expiresAt
        };
    }

    async validateSession(token) {
        const session = await new Promise((resolve, reject) => {
            this.db.get(`
                SELECT s.*, u.username, u.role, u.full_name, u.active
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.active = 1 AND s.expires_at > datetime('now')
                AND u.active = 1
            `, [token], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!session) {
            return null;
        }

        this.currentUser = {
            id: session.user_id,
            username: session.username,
            role: session.role,
            full_name: session.full_name,
            session_token: token
        };

        return this.currentUser;
    }

    async logout(token) {
        if (this.currentUser) {
            await this.logAudit(this.currentUser.id, 'logout', 'authentication', 
                'User logged out');
        }

        // Deactivate session
        await new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE user_sessions SET active = 0 WHERE token = ?',
                [token],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        this.currentUser = null;
        return { success: true };
    }

    async hasPermission(permission) {
        if (!this.currentUser) return false;

        const hasPermission = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT granted FROM permissions WHERE role = ? AND permission = ?',
                [this.currentUser.role, permission],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row && row.granted);
                }
            );
        });

        return hasPermission || false;
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async updateLastLogin(userId) {
        await new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET last_login = datetime("now") WHERE id = ?',
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async logAudit(userId, action, resource, details = '', ipAddress = '') {
        await new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO audit_log (user_id, action, resource, details, ip_address)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, action, resource, details, ipAddress], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    // User management methods for admin
    async createUser(userData) {
        if (!await this.hasPermission('users:manage')) {
            throw new Error('Insufficient permissions');
        }

        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = this.hashPassword(userData.password, salt);

        const userId = crypto.randomUUID();

        await new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO users (id, username, email, password_hash, salt, role, full_name, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                userData.username,
                userData.email,
                passwordHash,
                salt,
                userData.role,
                userData.full_name,
                userData.phone
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        await this.logAudit(this.currentUser.id, 'user_created', 'users', 
            `Created user: ${userData.username}`);

        return { id: userId, success: true };
    }
}

module.exports = { UserManager };