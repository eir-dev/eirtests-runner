import fetch from 'node-fetch'
import { ExportedTests, TestRunResults } from './types'

export interface EirTestsClientConfig {
  apiUrl: string
  apiKey: string
}

/**
 * Client for communicating with EirTests SaaS API
 */
export class EirTestsClient {
  private apiUrl: string
  private apiKey: string

  constructor(config: EirTestsClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, '') // Remove trailing slash
    this.apiKey = config.apiKey
  }

  /**
   * Fetch tests for a specific site
   */
  async getTests(siteId: string): Promise<ExportedTests> {
    const url = `${this.apiUrl}/api/testing/export-site-tests?site_id=${siteId}`

    console.log(`📡 Fetching tests from ${url}`)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to fetch tests: ${response.status} ${response.statusText}\n${errorText}`
        )
      }

      const data = await response.json() as ExportedTests

      console.log(`✅ Fetched ${data.total_tests} tests from ${data.site_name}`)
      console.log(`   - ${data.tests.filter(t => t.playwright_code).length} tests with code`)
      console.log(`   - ${data.tests.filter(t => !t.playwright_code).length} tests without code`)

      return data
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to EirTests API: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Report test results back to EirTests (optional)
   */
  async reportResults(results: TestRunResults): Promise<void> {
    const url = `${this.apiUrl}/api/testing/report-results`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(results),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`⚠️  Failed to report results: ${response.status} ${response.statusText}`)
        console.warn(errorText)
        return
      }

      console.log('✅ Results reported to EirTests')
    } catch (error) {
      console.warn('⚠️  Failed to report results:', error)
      // Don't throw - reporting is optional
    }
  }
}
