#!/usr/bin/env node

import * as dotenv from 'dotenv'
import { TestRunner } from './runner'
import { EirTestsConfig } from './types'

// Load environment variables from .env file
dotenv.config()

/**
 * CLI entry point for EirTests Runner
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'run'

  if (command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }

  if (command === '--version' || command === '-v') {
    console.log('eirtests-runner v1.0.0')
    process.exit(0)
  }

  if (command === 'config') {
    showConfig()
    process.exit(0)
  }

  if (command === 'run') {
    await runTests()
    return
  }

  console.error(`Unknown command: ${command}`)
  printHelp()
  process.exit(1)
}

/**
 * Run tests
 */
async function runTests() {
  // Build configuration from environment
  const config: EirTestsConfig = {
    apiUrl: process.env.EIRTESTS_API_URL || 'http://localhost:3000',
    apiKey: process.env.EIRTESTS_API_KEY || '',
    siteId: process.env.EIRTESTS_SITE_ID || '',
    secrets: {
      provider: 'env',
    },
    execution: {
      retries: parseInt(process.env.EIRTESTS_RETRIES || '2'),
      parallel: process.env.EIRTESTS_PARALLEL !== 'false',
    },
    reporting: {
      enabled: process.env.EIRTESTS_REPORT_RESULTS === 'true',
    },
  }

  // Validate required config
  if (!config.apiKey) {
    console.error('❌ Error: EIRTESTS_API_KEY environment variable is required')
    console.error('')
    console.error('Set it in your .env file or export it:')
    console.error('  export EIRTESTS_API_KEY="your-api-key"')
    console.error('')
    process.exit(1)
  }

  if (!config.siteId) {
    console.error('❌ Error: EIRTESTS_SITE_ID environment variable is required')
    console.error('')
    console.error('Set it in your .env file or export it:')
    console.error('  export EIRTESTS_SITE_ID="your-site-id"')
    console.error('')
    process.exit(1)
  }

  // Run tests
  const runner = new TestRunner(config)
  const exitCode = await runner.run()
  process.exit(exitCode)
}

/**
 * Show configuration
 */
function showConfig() {
  console.log('EirTests Runner Configuration')
  console.log('=============================')
  console.log('')
  console.log('API Settings:')
  console.log(`  API URL:  ${process.env.EIRTESTS_API_URL || 'http://localhost:3000'}`)
  console.log(`  API Key:  ${process.env.EIRTESTS_API_KEY ? '***' + process.env.EIRTESTS_API_KEY.slice(-4) : '(not set)'}`)
  console.log(`  Site ID:  ${process.env.EIRTESTS_SITE_ID || '(not set)'}`)
  console.log('')
  console.log('Execution Settings:')
  console.log(`  Retries:  ${process.env.EIRTESTS_RETRIES || '2'}`)
  console.log(`  Parallel: ${process.env.EIRTESTS_PARALLEL !== 'false' ? 'yes' : 'no'}`)
  console.log('')
  console.log('Secrets:')
  const testSecrets = Object.keys(process.env).filter(k => k.startsWith('TEST_'))
  if (testSecrets.length > 0) {
    testSecrets.forEach(key => {
      console.log(`  ${key}: ***`)
    })
  } else {
    console.log('  (none set)')
  }
  console.log('')
}

/**
 * Print help
 */
function printHelp() {
  console.log('EirTests Runner - On-premise test execution agent')
  console.log('')
  console.log('Usage:')
  console.log('  eirtests run              Run tests')
  console.log('  eirtests config           Show configuration')
  console.log('  eirtests --version        Show version')
  console.log('  eirtests --help           Show this help')
  console.log('')
  console.log('Environment Variables:')
  console.log('  EIRTESTS_API_URL          EirTests API URL (default: http://localhost:3000)')
  console.log('  EIRTESTS_API_KEY          EirTests API key (required)')
  console.log('  EIRTESTS_SITE_ID          Site ID to fetch tests for (required)')
  console.log('  EIRTESTS_RETRIES          Number of test retries (default: 2)')
  console.log('  EIRTESTS_PARALLEL         Run tests in parallel (default: true)')
  console.log('  EIRTESTS_REPORT_RESULTS   Report results back to EirTests (default: false)')
  console.log('')
  console.log('Test Secrets (prefix with TEST_):')
  console.log('  TEST_LOGIN_USERNAME       Username for test login')
  console.log('  TEST_LOGIN_PASSWORD       Password for test login')
  console.log('  TEST_API_KEY              API key for tests')
  console.log('  BASE_URL                  Base URL for tests')
  console.log('')
  console.log('Examples:')
  console.log('  # Set up and run')
  console.log('  export EIRTESTS_API_KEY="ert_..."')
  console.log('  export EIRTESTS_SITE_ID="84dce779-..."')
  console.log('  eirtests run')
  console.log('')
  console.log('  # Run with custom API URL')
  console.log('  export EIRTESTS_API_URL="https://api.eirtests.com"')
  console.log('  eirtests run')
  console.log('')
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
