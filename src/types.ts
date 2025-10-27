/**
 * Type definitions for EirTests Runner
 */

export interface EirTestsConfig {
  apiUrl: string
  apiKey: string
  siteId: string
  secrets: {
    provider: 'env' | 'vault' | 'github'
  }
  execution?: {
    retries?: number
    parallel?: boolean
    timeout?: number
  }
  reporting?: {
    enabled: boolean
  }
}

export interface ExportedTest {
  id: string
  title: string
  description: string | null
  bdd: string | null
  playwright_code: string | null
  code_version: number | null
  status: string
  priority: string
  persona: string
  tags: string[]
  file_path: string
}

export interface ExportedTests {
  site_id: string
  site_name: string
  site_url: string
  organization_id: string
  exported_at: string
  total_tests: number
  tests: ExportedTest[]
}

export interface TestResult {
  test_id: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

export interface TestRunResults {
  run_id: string
  site_id: string
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  tests: TestResult[]
}

export interface SecretsProvider {
  getSecret(key: string): Promise<string | undefined>
  getAllSecrets(): Promise<Record<string, string>>
}

// Playwright JSON reporter types
export interface PlaywrightJsonResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped'
  duration: number
  error?: {
    message: string
    stack?: string
  }
}

export interface PlaywrightJsonTest {
  title: string
  results: PlaywrightJsonResult[]
}

export interface PlaywrightJsonSpec {
  title: string
  tests: PlaywrightJsonTest[]
}

export interface PlaywrightJsonSuite {
  title: string
  file: string
  specs: PlaywrightJsonSpec[]
}

export interface PlaywrightJsonReport {
  suites: PlaywrightJsonSuite[]
}

// API submission types
export interface TestResultSubmission {
  test_card_id: string
  passed: boolean
  duration_ms: number
  error_message?: string
  status: 'passed' | 'failed'
}

export interface RunnerResultsSubmission {
  organization_id: string
  site_id: string
  environment_id?: string
  started_at: string
  finished_at: string
  status: 'passed' | 'failed'
  results: TestResultSubmission[]
}
