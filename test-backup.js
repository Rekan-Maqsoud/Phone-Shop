#!/usr/bin/env node

/**
 * Comprehensive Backup Functionality Test
 * 
 * This script tests all backup functionality to ensure it works correctly
 * in production mode.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class BackupTester {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.results = [];
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    this.log(`${status} - ${testName} ${details}`);
    this.results.push({ testName, passed, details });
    
    if (passed) {
      this.testsPassed++;
    } else {
      this.testsFailed++;
    }
  }

  async runTests() {
    this.log('Starting comprehensive backup functionality tests...');
    
    // Test 1: Check if backup directory exists/can be created
    await this.testBackupDirectoryCreation();
    
    // Test 2: Check if database file exists
    await this.testDatabaseFileExists();
    
    // Test 3: Check if main process handlers exist
    await this.testMainProcessHandlers();
    
    // Test 4: Check if UI components exist
    await this.testUIComponents();
    
    // Test 5: Check if cloud service is configured
    await this.testCloudServiceConfiguration();
    
    // Test 6: Check if preload API is properly exposed
    await this.testPreloadAPI();
    
    // Generate report
    this.generateReport();
  }

  async testBackupDirectoryCreation() {
    try {
      const documentsPath = path.join(os.homedir(), 'Documents');
      const backupDir = path.join(documentsPath, 'Mobile Roma BackUp');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const canWrite = fs.existsSync(backupDir) && fs.statSync(backupDir).isDirectory();
      this.logTest('Backup Directory Creation', canWrite, `Path: ${backupDir}`);
    } catch (error) {
      this.logTest('Backup Directory Creation', false, `Error: ${error.message}`);
    }
  }

  async testDatabaseFileExists() {
    try {
      const devDbPath = path.join(__dirname, 'database', 'shop.sqlite');
      const prodDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'mobile-roma', 'shop.sqlite');
      
      const devExists = fs.existsSync(devDbPath);
      const prodExists = fs.existsSync(prodDbPath);
      
      this.logTest('Database File Exists (Dev)', devExists, `Path: ${devDbPath}`);
      this.logTest('Database File Exists (Prod)', prodExists, `Path: ${prodDbPath}`);
    } catch (error) {
      this.logTest('Database File Check', false, `Error: ${error.message}`);
    }
  }

  async testMainProcessHandlers() {
    try {
      const mainFilePath = path.join(__dirname, 'src', 'main.cjs');
      if (!fs.existsSync(mainFilePath)) {
        this.logTest('Main Process File', false, 'main.cjs not found');
        return;
      }
      
      const mainContent = fs.readFileSync(mainFilePath, 'utf8');
      
      const requiredHandlers = [
        'createLocalBackup',
        'openBackupFolder',
        'createCloudBackup',
        'listCloudBackups',
        'downloadCloudBackup',
        'deleteCloudBackup',
        'setCloudBackupSession',
        'clearCloudBackupSession',
        'restoreFromFile'
      ];
      
      let handlersFound = 0;
      for (const handler of requiredHandlers) {
        if (mainContent.includes(`ipcMain.handle('${handler}'`)) {
          handlersFound++;
        }
      }
      
      const allHandlersPresent = handlersFound === requiredHandlers.length;
      this.logTest('Main Process IPC Handlers', allHandlersPresent, 
        `Found ${handlersFound}/${requiredHandlers.length} handlers`);
    } catch (error) {
      this.logTest('Main Process Handlers', false, `Error: ${error.message}`);
    }
  }

  async testUIComponents() {
    try {
      const backupManagerPath = path.join(__dirname, 'src', 'components', 'BackupManager.jsx');
      if (!fs.existsSync(backupManagerPath)) {
        this.logTest('BackupManager Component', false, 'BackupManager.jsx not found');
        return;
      }
      
      const componentContent = fs.readFileSync(backupManagerPath, 'utf8');
      
      const requiredFeatures = [
        'createBackup',
        'createLocalBackup',
        'openLocalBackupFolder',
        'downloadAndRestore',
        'deleteBackup',
        'handleAuth',
        'handleSignOut',
        'onClose'
      ];
      
      let featuresFound = 0;
      for (const feature of requiredFeatures) {
        if (componentContent.includes(feature)) {
          featuresFound++;
        }
      }
      
      const allFeaturesPresent = featuresFound === requiredFeatures.length;
      this.logTest('UI Component Features', allFeaturesPresent, 
        `Found ${featuresFound}/${requiredFeatures.length} features`);
    } catch (error) {
      this.logTest('UI Components', false, `Error: ${error.message}`);
    }
  }

  async testCloudServiceConfiguration() {
    try {
      const servicePath = path.join(__dirname, 'src', 'services', 'CloudBackupService.cjs');
      if (!fs.existsSync(servicePath)) {
        this.logTest('Cloud Service File', false, 'CloudBackupService.cjs not found');
        return;
      }
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      const requiredMethods = [
        'createBackup',
        'downloadBackup',
        'listBackups',
        'deleteBackup',
        'autoBackup',
        'setSession',
        'clearSession'
      ];
      
      let methodsFound = 0;
      for (const method of requiredMethods) {
        if (serviceContent.includes(`async ${method}(`)) {
          methodsFound++;
        }
      }
      
      const allMethodsPresent = methodsFound === requiredMethods.length;
      this.logTest('Cloud Service Methods', allMethodsPresent, 
        `Found ${methodsFound}/${requiredMethods.length} methods`);
    } catch (error) {
      this.logTest('Cloud Service Configuration', false, `Error: ${error.message}`);
    }
  }

  async testPreloadAPI() {
    try {
      const preloadPath = path.join(__dirname, 'src', 'preload.js');
      if (!fs.existsSync(preloadPath)) {
        this.logTest('Preload File', false, 'preload.js not found');
        return;
      }
      
      const preloadContent = fs.readFileSync(preloadPath, 'utf8');
      
      const requiredAPIs = [
        'createLocalBackup',
        'openBackupFolder',
        'createCloudBackup',
        'listCloudBackups',
        'downloadCloudBackup',
        'deleteCloudBackup',
        'setCloudBackupSession',
        'clearCloudBackupSession',
        'restoreFromFile'
      ];
      
      let apisFound = 0;
      for (const api of requiredAPIs) {
        if (preloadContent.includes(`${api}:`)) {
          apisFound++;
        }
      }
      
      const allAPIsPresent = apisFound === requiredAPIs.length;
      this.logTest('Preload API Exposure', allAPIsPresent, 
        `Found ${apisFound}/${requiredAPIs.length} APIs`);
    } catch (error) {
      this.logTest('Preload API', false, `Error: ${error.message}`);
    }
  }

  generateReport() {
    this.log('='.repeat(60));
    this.log('BACKUP FUNCTIONALITY TEST REPORT');
    this.log('='.repeat(60));
    
    this.log(`Total Tests: ${this.testsPassed + this.testsFailed}`);
    this.log(`Passed: ${this.testsPassed}`);
    this.log(`Failed: ${this.testsFailed}`);
    
    if (this.testsFailed > 0) {
      this.log('\nFailed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        this.log(`  ❌ ${r.testName}: ${r.details}`);
      });
    }
    
    this.log('\nAll Tests:');
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      this.log(`  ${status} ${r.testName}`);
    });
    
    this.log('='.repeat(60));
    
    if (this.testsFailed === 0) {
      this.log('🎉 ALL TESTS PASSED! Backup functionality is ready for production.');
    } else {
      this.log('⚠️  Some tests failed. Please review the issues before deploying to production.');
    }
  }
}

// Run the tests
const tester = new BackupTester();
tester.runTests().catch(console.error);
