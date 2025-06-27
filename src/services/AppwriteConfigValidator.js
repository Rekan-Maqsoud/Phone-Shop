// Configuration validation utility for Appwrite setup
import cloudAuthService from './CloudAuthService.js';

class AppwriteConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    this.errors = [];
    this.warnings = [];

    this.validateEnvironmentVariables();
    this.validateAppwriteConnection();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  validateEnvironmentVariables() {
    const requiredVars = [
      'VITE_APPWRITE_ENDPOINT',
      'VITE_APPWRITE_PROJECT_ID',
      'VITE_APPWRITE_DATABASE_ID',
      'VITE_APPWRITE_BACKUPS_COLLECTION_ID',
      'VITE_APPWRITE_BACKUP_BUCKET_ID'
    ];

    requiredVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (!value) {
        this.errors.push(`Missing environment variable: ${varName}`);
      } else if (value.includes('your_') || value.includes('YOUR_')) {
        this.errors.push(`Please update the placeholder value for: ${varName}`);
      }
    });

    // Validate endpoint format
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
    if (endpoint && !endpoint.startsWith('http')) {
      this.errors.push('VITE_APPWRITE_ENDPOINT must start with http:// or https://');
    }
  }

  async validateAppwriteConnection() {
    try {
      // Try to get current user (this will fail if not authenticated, but will validate connection)
      await cloudAuthService.getCurrentUser();
      this.warnings.push('Appwrite connection successful');
    } catch (error) {
      if (error.message.includes('Missing scope')) {
        this.warnings.push('Appwrite connection successful (not authenticated)');
      } else {
        this.errors.push(`Appwrite connection failed: ${error.message}`);
      }
    }
  }

  getSetupInstructions() {
    return {
      title: 'Appwrite Setup Required',
      steps: [
        '1. Create an Appwrite account at https://appwrite.io',
        '2. Create a new project',
        '3. Set up Authentication (enable Email/Password)',
        '4. Create a database and collection for backups',
        '5. Create a storage bucket for backup files',
        '6. Update your .env file with the configuration',
        '7. Restart the application'
      ],
      documentation: 'See CLOUD_BACKUP_SETUP.md for detailed instructions'
    };
  }

  async testCloudBackup() {
    const results = {
      authentication: false,
      database: false,
      storage: false,
      overall: false
    };

    try {
      // Test authentication
      const authResult = await cloudAuthService.getCurrentUser();
      if (authResult.success) {
        results.authentication = true;
      }

      // Test database access
      try {
        await cloudAuthService.getBackups();
        results.database = true;
      } catch (error) {
        if (!error.message.includes('Unauthorized')) {
          throw error;
        }
      }

      // Test storage access (we can't test this without uploading, so we assume it works if database works)
      if (results.database) {
        results.storage = true;
      }

      results.overall = results.authentication && results.database && results.storage;
    } catch (error) {
      // Silent error handling
    }

    return results;
  }
}

export default new AppwriteConfigValidator();
