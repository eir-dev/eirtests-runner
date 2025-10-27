import { SecretsProvider } from '../types'

/**
 * Secrets provider that reads from environment variables
 *
 * Supports variables with TEST_ prefix for test-specific secrets
 * Example: TEST_LOGIN_USERNAME, TEST_API_KEY
 */
export class EnvSecretsProvider implements SecretsProvider {
  async getSecret(key: string): Promise<string | undefined> {
    // Try with TEST_ prefix first
    const testKey = `TEST_${key}`
    if (process.env[testKey]) {
      return process.env[testKey]
    }

    // Fall back to direct key
    return process.env[key]
  }

  async getAllSecrets(): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {}

    // Get all environment variables starting with TEST_
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('TEST_')) {
        const value = process.env[key]
        if (value) {
          secrets[key] = value
        }
      }
    })

    return secrets
  }

  /**
   * Get all secrets formatted for Playwright environment
   */
  async getSecretsForPlaywright(): Promise<Record<string, string>> {
    const secrets = await this.getAllSecrets()

    // Also include common environment variables
    if (process.env.BASE_URL) {
      secrets.BASE_URL = process.env.BASE_URL
    }

    return secrets
  }
}
