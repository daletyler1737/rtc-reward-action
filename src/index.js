const core = require('@actions/core');
const github = require('@actions/github');

async function extractWallet(prBody) {
  if (!prBody) return null;
  
  // Match patterns like "wallet: XXXX" or "rtc-wallet: XXXX"
  const patterns = [
    /(?:wallet|rtc[-_]?wallet)[\s:]+([A-Za-z0-9]+)/i,
    /(?:recipient|to)[\s:]+([A-Za-z0-9]+)/i,
    /^([A-Za-z0-9]{20,})$/m,  // standalone 20+ char string
  ];
  
  for (const pattern of patterns) {
    const match = prBody.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function callRTCRewardApi(nodeUrl, walletFrom, walletTo, amount, adminKey) {
  const url = `${nodeUrl}/api/award`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminKey}`
    },
    body: JSON.stringify({
      from: walletFrom,
      to: walletTo,
      amount: parseFloat(amount),
      token: 'RTC'
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RTC API error ${response.status}: ${text}`);
  }
  
  return await response.json();
}

async function run() {
  const token = core.getInput('token') || process.env.GITHUB_TOKEN;
  const nodeUrl = core.getInput('node-url');
  const amount = core.getInput('amount');
  const walletFrom = core.getInput('wallet-from');
  const adminKey = core.getInput('admin-key');
  const dryRun = core.getInput('dry-run').toLowerCase() === 'true';
  const minLines = parseInt(core.getInput('min-contribution-lines') || '1');
  
  const octokit = github.getOctokit(token);
  const context = github.context;
  
  // Only run on merged PRs
  if (context.eventName !== 'pull_request') {
    console.log('Not a pull_request event, skipping');
    return;
  }
  
  const pr = context.payload.pull_request;
  if (!pr.merged) {
    console.log('PR not merged, skipping');
    return;
  }
  
  console.log(`Processing merged PR #${pr.number}: ${pr.title}`);
  
  // Extract contributor wallet from PR body
  let contributorWallet = await extractWallet(pr.body);
  
  if (!contributorWallet) {
    // Try to get from PR author
    contributorWallet = pr.user?.login;
    console.log(`No wallet in PR body, using GitHub username: ${contributorWallet}`);
  } else {
    console.log(`Found wallet: ${contributorWallet}`);
  }
  
  if (dryRun) {
    console.log(`[DRY RUN] Would award ${amount} RTC to ${contributorWallet}`);
    core.setOutput('dry-run', true);
    core.setOutput('wallet', contributorWallet);
    core.setOutput('amount', amount);
    return;
  }
  
  // Call RTC reward API
  try {
    const result = await callRTCRewardApi(nodeUrl, walletFrom, contributorWallet, amount, adminKey);
    console.log(`Awarded ${amount} RTC to ${contributorWallet}`);
    console.log('Transaction result:', JSON.stringify(result));
    
    // Post comment on PR
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pr.number,
      body: `## 🎉 RTC Reward Sent!\n\n**Amount:** ${amount} RTC\n**Recipient:** ${contributorWallet}\n**TX:** ${result.txId || result.hash || 'confirmed'}\n\nThank you for your contribution!`
    });
    
    core.setOutput('awarded', true);
    core.setOutput('wallet', contributorWallet);
    core.setOutput('amount', amount);
    core.setOutput('tx-id', result.txId || result.hash || '');
  } catch (error) {
    console.error(`Failed to award RTC: ${error.message}`);
    core.setFailed(error.message);
    
    // Post failure comment
    try {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: pr.number,
        body: `## ⚠️ RTC Reward Failed\n\n**Recipient:** ${contributorWallet}\n**Error:** ${error.message}\n\nPlease contact a maintainer to claim your reward manually.`
      });
    } catch (commentError) {
      console.error('Failed to post comment:', commentError.message);
    }
  }
}

module.exports = run;

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
