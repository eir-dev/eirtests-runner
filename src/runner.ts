import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import { EirTestsClient } from './api-client'
import { EnvSecretsProvider } from './secrets/env'
import {
  EirTestsConfig,
  ExportedTest,
  ExportedTests,
  PlaywrightJsonReport,
  TestResultSubmission,
  RunnerResultsSubmission
} from './types'

/**
 * Main test runner orchestrator
 *
 * Fetches tests from EirTests API, writes to temp directory,
 * injects secrets, and executes with Playwright
 */
export class TestRunner {
  private config: EirTestsConfig
  private client: EirTestsClient
  private secretsProvider: EnvSecretsProvider
  private tempDir: string
  private testFileToCardIdMap: Map<string, string> = new Map()
  private exportedTests: ExportedTests | null = null

  constructor(config: EirTestsConfig) {
    this.config = config
    this.client = new EirTestsClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
    })
    this.secretsProvider = new EnvSecretsProvider()
    this.tempDir = `/tmp/eirtests-${Date.now()}`
  }

  /**
   * Run the complete test execution flow
   */
  async run(): Promise<number> {
    const startTime = new Date().toISOString()

    try {
      console.log('🚀 EirTests Runner')
      console.log('==================')
      console.log('')

      // 1. Validate configuration
      this.validateConfig()

      // 2. Fetch tests from API
      console.log('📦 Fetching tests from EirTests...')
      this.exportedTests = await this.client.getTests(this.config.siteId)
      console.log('')

      // 3. Create temp directory
      console.log(`📝 Writing tests to ${this.tempDir}/`)
      this.createTempDirectory()

      // 4. Write test files
      const testsWritten = this.writeTestFiles(this.exportedTests.tests)
      console.log(`✅ Wrote ${testsWritten} test files`)
      console.log('')

      if (testsWritten === 0) {
        console.log('⚠️  No tests with code found. Skipping execution.')
        this.cleanup()
        return 0
      }

      // 5. Load secrets
      console.log('🔐 Loading secrets...')
      const secrets = await this.secretsProvider.getSecretsForPlaywright()
      console.log(`✅ Loaded ${Object.keys(secrets).length} secrets`)
      console.log('')

      // 6. Execute tests with Playwright
      console.log('🧪 Executing tests with Playwright...')
      console.log('')
      const exitCode = this.executeTests(secrets)

      // 7. Report results
      console.log('')
      const finishTime = new Date().toISOString()
      await this.reportResults(startTime, finishTime, exitCode)

      // 8. Cleanup
      console.log('')
      this.cleanup()

      // 9. Summary
      console.log('')
      if (exitCode === 0) {
        console.log('✨ All tests passed!')
      } else {
        console.log(`❌ Some tests failed (exit code: ${exitCode})`)
      }

      return exitCode
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error)
      this.cleanup()
      return 1
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('EIRTESTS_API_KEY is required')
    }
    if (!this.config.siteId) {
      throw new Error('EIRTESTS_SITE_ID is required')
    }
  }

  /**
   * Create temporary directory for tests
   */
  private createTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  /**
   * Write test files to temp directory
   */
  private writeTestFiles(tests: ExportedTest[]): number {
    let written = 0

    for (const test of tests) {
      // Skip tests without code
      if (!test.playwright_code) {
        console.log(`  ⏭️  Skipping: ${test.title} (no code)`)
        continue
      }

      // Create directory structure
      const fullPath = path.join(this.tempDir, test.file_path)
      const dir = path.dirname(fullPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Clean code (remove markdown fences if present)
      let code = test.playwright_code
      if (code.startsWith('```')) {
        code = code.replace(/^```typescript\n/, '').replace(/^```\n/, '').replace(/\n```$/, '')
      }

      // Write file
      fs.writeFileSync(fullPath, code, 'utf-8')
      console.log(`  ✅ ${test.file_path}`)

      // Store mapping for result reporting
      this.testFileToCardIdMap.set(fullPath, test.id)

      written++
    }

    return written
  }

  /**
   * Execute tests with Playwright
   */
  private executeTests(secrets: Record<string, string>): number {
    try {
      // Build environment with secrets
      // Add NODE_PATH so tests can find @playwright/test
      const env = {
        ...process.env,
        ...secrets,
        NODE_PATH: path.join(__dirname, '../node_modules'),
      }

      // Execute Playwright
      execSync(`npx playwright test ${this.tempDir}`, {
        stdio: 'inherit',
        env,
        cwd: process.cwd(), // Run from eirtests-runner directory
      })

      return 0
    } catch (error: any) {
      // Playwright returns non-zero exit code on test failures
      return error.status || 1
    }
  }

  /**
   * Clean up temp directory
   */
  private cleanup(): void {
    if (fs.existsSync(this.tempDir)) {
      console.log('🧹 Cleaning up...')
      fs.rmSync(this.tempDir, { recursive: true, force: true })
    }
  }

  /**
   * Report results back to EirTests API
   */
  private async reportResults(
    startTime: string,
    finishTime: string,
    exitCode: number
  ): Promise<void> {
    // Skip if reporting is disabled or no tests were fetched
    if (!this.exportedTests) {
      return
    }

    try {
      console.log('📊 Reporting results to EirTests...')

      // Check if JSON results file exists
      const jsonResultsPath = path.join(process.cwd(), 'test-results.json')
      if (!fs.existsSync(jsonResultsPath)) {
        console.log('⚠️  No test results file found, skipping reporting')
        return
      }

      // Parse Playwright JSON results
      const jsonContent = fs.readFileSync(jsonResultsPath, 'utf-8')
      const playwrightResults: PlaywrightJsonReport = JSON.parse(jsonContent)

      // Transform results to API format
      const results: TestResultSubmission[] = []

      for (const suite of playwrightResults.suites) {
        // Get the test file path from the suite
        let testFilePath = suite.file

        // Extract the relative path from the temp directory
        // suite.file looks like: eirtests-1761535321504/tests/smoke/test.spec.ts
        // We need to match against: /tmp/eirtests-1761535321504/tests/smoke/test.spec.ts

        // Find the eirtests-* directory name in the path
        const tempDirMatch = testFilePath.match(/eirtests-\d+\/(.+)$/)
        if (tempDirMatch) {
          // Reconstruct the path using our temp directory
          const relativePath = tempDirMatch[1] // e.g., "tests/smoke/test.spec.ts"
          testFilePath = path.join(this.tempDir, relativePath)
        }

        // Look up test_card_id from our mapping
        const testCardId = this.testFileToCardIdMap.get(testFilePath)

        if (!testCardId) {
          console.log(`⚠️  Could not find test_card_id for: ${suite.file} -> ${testFilePath}`)
          continue
        }

        // Process each spec (test) in the suite
        for (const spec of suite.specs || []) {
          // Get the first test (usually only one test per spec)
          const test = spec.tests?.[0]
          if (!test || !test.results || test.results.length === 0) {
            continue
          }

          // Get the latest result (after retries)
          const latestResult = test.results[test.results.length - 1]
          const passed = latestResult.status === 'passed'
          const errorMessage = latestResult.error?.message

          results.push({
            test_card_id: testCardId,
            passed,
            duration_ms: latestResult.duration,
            error_message: errorMessage,
            status: passed ? 'passed' : 'failed',
          })
        }
      }

      if (results.length === 0) {
        console.log('⚠️  No test results to report')
        return
      }

      console.log(`📝 Collected ${results.length} test results`)
      console.log(`   Passed: ${results.filter(r => r.passed).length}`)
      console.log(`   Failed: ${results.filter(r => !r.passed).length}`)

      // Prepare submission
      const submission: RunnerResultsSubmission = {
        organization_id: this.exportedTests.organization_id,
        site_id: this.exportedTests.site_id,
        started_at: startTime,
        finished_at: finishTime,
        status: exitCode === 0 ? 'passed' : 'failed',
        results,
      }

      // Submit to API
      const response = await fetch(
        `${this.config.apiUrl}/api/testing/submit-runner-results`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to submit results: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log(`✅ Results reported: Test Run ${result.test_run_id}`)
      console.log(`   ${result.results_created} test results created`)
    } catch (error) {
      console.error('⚠️  Failed to report results:', error instanceof Error ? error.message : error)
      // Don't fail the entire run if reporting fails
    }
  }
}
