# RTC Reward Action

🥇 **Automatically award RTC tokens when a PR is merged**

This GitHub Action turns any repository into a crypto-powered bounty platform. Maintainers add one YAML file and contributors earn RTC for merged PRs.

## Features

- ✅ Configurable RTC amount per merge
- ✅ Reads contributor wallet from PR body (e.g., `wallet: RTCxxxx`)
- ✅ Falls back to GitHub username if no wallet provided
- ✅ Posts reward confirmation comment on the PR
- ✅ Dry-run mode for testing
- ✅ Configurable minimum contribution threshold

## Usage

### Quick Start

Add this to your repository as `.github/workflows/rtc-reward.yml`:

```yaml
name: RTC Reward

on:
  pull_request:
    types: [closed]

jobs:
  reward:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: Scottcjn/rtc-reward-action@v1
        with:
          node-url: "https://50.28.86.131"
          amount: "5"
          wallet-from: "project-fund"
          admin-key: ${{ secrets.RTC_ADMIN_KEY }}
```

### Configuration

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `node-url` | Yes | - | RTC node RPC URL |
| `amount` | Yes | - | RTC to award per merge |
| `wallet-from` | Yes | - | Source wallet/account |
| `admin-key` | Yes | - | Admin key for the node |
| `dry-run` | No | `false` | Test mode (no txs) |
| `min-contribution-lines` | No | `1` | Min lines changed |

### Contributor Wallet Setup

Contributors add their wallet in the PR body:

```markdown
## Wallet
wallet: RTCed65da2cc0f6463d7ac5fb23b93d798911af9ccb
```

Or simply use their GitHub username as the wallet identifier.

### GitHub Secrets

1. Go to **Settings → Secrets → Actions**
2. Add `RTC_ADMIN_KEY` with your admin key

### Testing Locally

```yaml
- uses: Scottcjn/rtc-reward-action@v1
  with:
    dry-run: true
    node-url: "https://50.28.86.131"
    amount: "5"
    wallet-from: "test"
    admin-key: "test"
```

## Example Output

### PR Comment (Success)

> ## 🎉 RTC Reward Sent!
> 
> **Amount:** 5 RTC
> **Recipient:** RTCed65da2cc0f6463d7ac5fb23b93d798911af9ccb
> **TX:** 7a3f8b9c...
> 
> Thank you for your contribution!

### PR Comment (Failure)

> ## ⚠️ RTC Reward Failed
> 
> **Recipient:** some-user
> **Error:** Insufficient balance
> 
> Please contact a maintainer to claim your reward manually.

## License

MIT
