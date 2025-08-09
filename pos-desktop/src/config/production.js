// Production Configuration for GiLi PoS
const os = require('os');
const path = require('path');

const ProductionConfig = {
    // Application Settings
    app: {
        name: 'GiLi Point of Sale',
        version: '1.0.0',
        environment: 'production',
        debug: false,
        autoUpdater: true,
        crashReporting: true,
        analytics: true
    },

    // Database Configuration
    database: {
        name: 'gili-pos.db',
        backup_enabled: true,
        backup_interval: 24 * 60 * 60 * 1000, // 24 hours
        max_backups: 7,
        auto_vacuum: true,
        wal_mode: true // Write-Ahead Logging for better performance
    },

    // Security Settings
    security: {
        encryption_enabled: true,
        session_timeout: 8 * 60 * 60 * 1000, // 8 hours
        max_failed_attempts: 3,
        lockout_duration: 15 * 60 * 1000, // 15 minutes
        password_policy: {
            min_length: 8,
            require_numbers: true,
            require_special_chars: true,
            require_uppercase: true
        },
        two_factor_enabled: false, // Can be enabled later
        audit_log_enabled: true
    },

    // Network & Sync Configuration
    network: {
        server_url: process.env.GILI_SERVER_URL || 'https://api.gili.com',
        api_timeout: 30000,
        retry_attempts: 3,
        retry_delay: 2000,
        heartbeat_interval: 60000, // 1 minute
        offline_threshold: 5 * 60 * 1000, // 5 minutes
        sync_interval: 10 * 60 * 1000, // 10 minutes
        batch_size: 100,
        compression_enabled: true
    },

    // Hardware Settings
    hardware: {
        receipt_printer: {
            enabled: true,
            type: 'thermal',
            auto_detect: true,
            retry_attempts: 3,
            test_on_startup: true
        },
        cash_drawer: {
            enabled: true,
            auto_open: true,
            open_timeout: 5000
        },
        barcode_scanner: {
            enabled: true,
            auto_detect: true,
            buffer_timeout: 100,
            min_length: 8
        },
        pole_display: {
            enabled: false, // For customer-facing display
            port: 'COM5'
        }
    },

    // Performance Settings
    performance: {
        memory_limit: '512MB',
        cache_size: 100, // Number of products to cache
        image_cache_size: 50,
        transaction_batch_size: 50,
        product_page_size: 100,
        lazy_loading: true,
        compression: true
    },

    // Logging Configuration
    logging: {
        level: 'info', // error, warn, info, debug
        file_enabled: true,
        console_enabled: false,
        max_file_size: '10MB',
        max_files: 5,
        log_directory: path.join(os.homedir(), 'AppData', 'Roaming', 'gili-pos', 'logs'),
        audit_enabled: true,
        sensitive_data_mask: true
    },

    // Business Rules
    business: {
        currency: 'USD',
        currency_symbol: '$',
        decimal_places: 2,
        tax_rate: 0.08, // 8% default
        tax_included: false,
        rounding_method: 'round', // floor, ceil, round
        max_discount_percent: 50,
        max_refund_days: 30,
        receipt_footer: 'Thank you for shopping with us!',
        store_hours: {
            monday: { open: '09:00', close: '21:00' },
            tuesday: { open: '09:00', close: '21:00' },
            wednesday: { open: '09:00', close: '21:00' },
            thursday: { open: '09:00', close: '21:00' },
            friday: { open: '09:00', close: '22:00' },
            saturday: { open: '08:00', close: '22:00' },
            sunday: { open: '10:00', close: '20:00' }
        }
    },

    // Backup & Recovery
    backup: {
        enabled: true,
        location: path.join(os.homedir(), 'Documents', 'GiLi PoS Backups'),
        schedule: '0 2 * * *', // Daily at 2 AM
        cloud_backup: false,
        encrypt_backups: true,
        retention_days: 90
    },

    // User Interface
    ui: {
        theme: 'light',
        language: 'en',
        show_tips: true,
        auto_logout: true,
        auto_logout_time: 30 * 60 * 1000, // 30 minutes
        sound_enabled: true,
        animations_enabled: true,
        high_contrast: false
    },

    // Reports & Analytics
    reporting: {
        enabled: true,
        local_storage_days: 365,
        export_formats: ['pdf', 'excel', 'csv'],
        scheduled_reports: true,
        email_reports: false, // Requires email configuration
        dashboard_refresh: 5 * 60 * 1000 // 5 minutes
    },

    // Development/Support
    support: {
        crash_reporting: true,
        usage_analytics: true,
        remote_assistance: false,
        auto_updates: true,
        update_channel: 'stable', // stable, beta
        telemetry: true
    }
};

// Environment-specific overrides
const EnvironmentOverrides = {
    development: {
        app: { debug: true, crashReporting: false },
        database: { backup_enabled: false },
        logging: { level: 'debug', console_enabled: true },
        network: { server_url: 'http://localhost:8001' },
        support: { crash_reporting: false, usage_analytics: false }
    },
    
    staging: {
        app: { debug: true },
        network: { server_url: 'https://staging-api.gili.com' },
        support: { update_channel: 'beta' }
    },
    
    production: {
        // Use defaults from ProductionConfig
    }
};

class ConfigManager {
    constructor() {
        this.config = { ...ProductionConfig };
        this.environment = process.env.NODE_ENV || 'production';
        this.applyEnvironmentOverrides();
    }

    applyEnvironmentOverrides() {
        const overrides = EnvironmentOverrides[this.environment];
        if (overrides) {
            this.config = this.deepMerge(this.config, overrides);
        }
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
    }

    set(path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this.config);
        target[last] = value;
    }

    getAll() {
        return { ...this.config };
    }

    validate() {
        const required = [
            'app.name',
            'network.server_url',
            'database.name',
            'business.currency'
        ];

        const missing = required.filter(path => !this.get(path));
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        return true;
    }
}

module.exports = { ConfigManager, ProductionConfig };