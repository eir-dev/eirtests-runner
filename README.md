# EirTests Runner

**On-premise test execution agent for EirTests**

Run your EirTests test suite on your own infrastructure with your own secrets management. The runner fetches tests at runtime from EirTests SaaS, injects your private secrets, and executes them in your network with access to private endpoints.

---

## 🎯 Key Features

- ✅ **Fetch tests at runtime** - Always execute the latest version
- ✅ **On-premise execution** - Runs in your private network
- ✅ **Private secrets** - Integrates with your secrets management
- ✅ **GitHub Actions ready** - Self-hosted runner support
- ✅ **Zero maintenance** - No manual test synchronization
- ✅ **Access private endpoints** - Test internal services

---

## 🚀 Quick Start (5 minutes)

### 1. Clone this repository

```bash
git clone https://github.com/eir/eirtests-runner
cd eirtests-runner
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# Your EirTests API key (get from EirTests dashboard)
EIRTESTS_API_KEY=ert_your_api_key_here

# Your site ID (get from EirTests dashboard)
EIRTESTS_SITE_ID=84dce779-87d8-4d1a-b763-b89712bd36c8

# EirTests API URL
EIRTESTS_API_URL=https://api.eirtests.com  # Or http://localhost:3000 for local dev

# Test environment
BASE_URL=https://staging.yoursite.com

# Test credentials
TEST_LOGIN_USERNAME=test@example.com
TEST_LOGIN_PASSWORD=your_password_here
```

### 4. Run tests

```bash
npm test
```

That's it! The runner will:
1. Fetch your latest tests from EirTests
2. Write them to a temp directory
3. Inject your secrets
4. Execute with Playwright
5. Clean up

---

## 📖 How It Works

```
┌─────────────────────────────────────┐
│   EirTests SaaS (Source of Truth)   │
│   - Test code storage               │
│   - Test versioning                 │
└──────────────┬──────────────────────┘
               │
               │ HTTPS API (authenticated)
               ▼
┌─────────────────────────────────────┐
│   Your Network (Private)            │
│                                     │
│  ┌────────────────────────────┐    │
│  │  EirTests Runner Agent     │    │
│  │  1. Fetches tests          │    │
│  │  2. Injects secrets        │◄───┼─── Your Vault/Secrets
│  │  3. Executes with Playwright│   │      (private)
│  │  4. Reports results         │   │
│  └────────────┬───────────────┘    │
│               │                     │
│               ▼                     │
│     Your Private Test Environments │
│     (not accessible from internet) │
└─────────────────────────────────────┘
```

---

## 🔐 Secrets Management

### Environment Variables (Default)

The simplest approach - store secrets in `.env` or environment variables.

Any variable starting with `TEST_` is automatically available to your tests:

```bash
TEST_LOGIN_USERNAME=admin@example.com
TEST_LOGIN_PASSWORD=secret123
TEST_API_KEY=sk_test_abc123
BASE_URL=https://staging.example.com
```

### HashiCorp Vault (Phase 2)

Coming soon! Integrate with your existing Vault installation:

```typescript
// eirtests.config.ts
export default {
  secrets: {
    provider: 'vault',
    vault: {
      url: process.env.VAULT_URL,
      token: process.env.VAULT_TOKEN,
      path: 'secret/eirtests'
    }
  }
}
```

---

## 🤖 GitHub Actions

Run tests automatically on a schedule or on every push.

### 1. Set up self-hosted runner

Follow [GitHub's guide](https://docs.github.com/en/actions/hosting-your-own-runners) to set up a runner in your network.

### 2. Add secrets to GitHub

Go to **Settings → Secrets and variables → Actions**:

**Secrets** (sensitive data):
- `EIRTESTS_API_KEY` - Your EirTests API key
- `TEST_LOGIN_USERNAME` - Test login username
- `TEST_LOGIN_PASSWORD` - Test login password
- `TEST_API_KEY` - API key for tests

**Variables** (non-sensitive):
- `SITE_ID` - Your EirTests site ID
- `EIRTESTS_API_URL` - EirTests API URL
- `BASE_URL` - Base URL for tests

### 3. The workflow runs automatically

See `.github/workflows/run-tests.yml` for the complete workflow.

---

## 🛠️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EIRTESTS_API_KEY` | ✅ | - | Your EirTests API key |
| `EIRTESTS_SITE_ID` | ✅ | - | Site ID to fetch tests for |
| `EIRTESTS_API_URL` | ❌ | `http://localhost:3000` | EirTests API URL |
| `EIRTESTS_RETRIES` | ❌ | `2` | Number of test retries |
| `EIRTESTS_PARALLEL` | ❌ | `true` | Run tests in parallel |
| `BASE_URL` | ❌ | - | Base URL for tests |
| `TEST_*` | ❌ | - | Any secret for tests |

### CLI Commands

```bash
# Run tests
eirtests run
npm test

# Show configuration
eirtests config

# Show version
eirtests --version

# Show help
eirtests --help
```

---

## 📊 Example Output

```
🚀 EirTests Runner
==================

📦 Fetching tests from EirTests...
📡 Fetching tests from http://localhost:3000/api/testing/export-site-tests?site_id=84dce779-...
✅ Fetched 16 tests from www.returnit.com.au
   - 9 tests with code
   - 7 tests without code

📝 Writing tests to /tmp/eirtests-1730012345/
  ✅ tests/smoke/verify-returnit-victoria-header-loads-correctly.spec.ts
  ✅ tests/mobile-app/verify-cds-vic-east-app-information-is-displayed.spec.ts
  ✅ tests/smoke/verify-user-login-to-access-recycling-history.spec.ts
  [... 6 more tests]
✅ Wrote 9 test files

🔐 Loading secrets...
✅ Loaded 5 secrets

🧪 Executing tests with Playwright...

Running 9 tests using 1 worker

  ✓ verify-returnit-victoria-header-loads-correctly.spec.ts:3:1 › Verify ReturnIt Victoria header loads correctly (2.1s)
  ✓ verify-cds-vic-east-app-information-is-displayed.spec.ts:3:1 › Verify CDS Vic East app information is displayed (3.2s)
  [... more tests]

  9 passed (18.3s)

🧹 Cleaning up...

✨ All tests passed!
```

---

## 🔄 Automatic Updates

**No manual synchronization needed!**

When you update a test in EirTests:
1. The next test run automatically fetches the new version
2. No git commits, no pull requests, no manual sync
3. Always execute the latest approved test code

---

## 🎯 Use Cases

### 1. Scheduled Testing
Run tests every 6 hours to catch regressions early:

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'
```

### 2. Pre-Deployment Validation
Run tests before deploying to production:

```yaml
on:
  push:
    branches: [main]
```

### 3. Private Network Testing
Test internal services not accessible from the internet:

```bash
# Tests run on your self-hosted runner
# with access to internal endpoints
BASE_URL=https://internal-staging.yourcompany.local
```

### 4. Compliance & Security
Keep secrets in your infrastructure:

```bash
# Secrets never leave your network
# Pull from your Vault at runtime
VAULT_URL=https://vault.internal
```

---

## 🐛 Troubleshooting

### Tests not fetching

```bash
# Check your configuration
eirtests config

# Verify API key is set
echo $EIRTESTS_API_KEY

# Test API connection
curl -H "Authorization: Bearer $EIRTESTS_API_KEY" \
  "$EIRTESTS_API_URL/api/testing/export-site-tests?site_id=$EIRTESTS_SITE_ID"
```

### No tests executing

This means all your tests are in "proposed" or "added" status without code generated yet.

1. Go to EirTests dashboard
2. Review and approve test proposals
3. Generate test code
4. Re-run the agent

### Secrets not working

```bash
# List secrets being loaded
eirtests config

# Verify TEST_ prefix
export TEST_LOGIN_USERNAME=admin  # ✅ Correct
export LOGIN_USERNAME=admin        # ❌ Won't work
```

---

## 🔜 Roadmap (Phase 2)

- [ ] HashiCorp Vault integration
- [ ] AWS Secrets Manager integration
- [ ] Result reporting back to EirTests
- [ ] Test caching for faster runs
- [ ] Parallel execution across multiple runners
- [ ] Slack/Teams notifications
- [ ] Test drift detection

---

## 📚 Documentation

- [EirTests Documentation](https://docs.eirtests.com)
- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Self-hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)

---

## 🤝 Support

Need help? Contact EirTests support:
- Email: support@eirtests.com
- Docs: https://docs.eirtests.com
- GitHub Issues: https://github.com/eir/eirtests-runner/issues

---

## 📄 License

MIT

---

**Built with ❤️ by EirTests**
