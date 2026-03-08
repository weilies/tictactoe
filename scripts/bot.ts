import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'weilies/tictactoe';
const BOT_ASSIGNEE = process.env.BOT_ASSIGNEE ?? 'claudebot';
const PROCESSED_LABEL = 'bot-processed';
const VERCEL_URL = 'https://tictactoe-psi-mocha.vercel.app';
const PAGE_PATH = path.join(process.cwd(), 'src/app/page.tsx');
const POLL_INTERVAL_MS = 60 * 60_000; // 1 hour

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_TOKEN environment variable.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable.');
  process.exit(1);
}

const client = new Anthropic();

const ghHeaders: Record<string, string> = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

async function fetchPendingIssues(): Promise<any[]> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues?state=open&assignee=${BOT_ASSIGNEE}`,
    { headers: ghHeaders },
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  const issues: any[] = await res.json();
  return issues.filter(
    (issue) => !issue.labels.some((l: any) => l.name === PROCESSED_LABEL),
  );
}

async function ensureLabel(): Promise<void> {
  // Create the label if it doesn't exist; ignore errors if it already does
  await fetch(`https://api.github.com/repos/${REPO}/labels`, {
    method: 'POST',
    headers: ghHeaders,
    body: JSON.stringify({ name: PROCESSED_LABEL, color: '0075ca', description: 'Processed by Claude bot' }),
  });
}

async function addLabel(issueNumber: number): Promise<void> {
  await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: ghHeaders,
    body: JSON.stringify({ labels: [PROCESSED_LABEL] }),
  });
}

async function addComment(issueNumber: number, body: string): Promise<void> {
  await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: ghHeaders,
    body: JSON.stringify({ body }),
  });
}

async function closeIssue(issueNumber: number): Promise<void> {
  await fetch(`https://api.github.com/repos/${REPO}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: ghHeaders,
    body: JSON.stringify({ state: 'closed' }),
  });
}

async function fixIssue(issue: any): Promise<void> {
  console.log(`\n→ Processing issue #${issue.number}: ${issue.title}`);

  const currentCode = readFileSync(PAGE_PATH, 'utf-8');

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: `You are a React/Next.js expert. Given a GitHub issue describing a UI change and the current code for a Tic Tac Toe game, return ONLY the complete updated file — raw TypeScript/TSX, no markdown code fences, no explanation, no preamble. The output must be valid TypeScript that can be written directly to src/app/page.tsx.`,
    messages: [
      {
        role: 'user',
        content: `Issue #${issue.number}: ${issue.title}\n\n${issue.body ?? '(no description)'}\n\nCurrent src/app/page.tsx:\n\n${currentCode}`,
      },
    ],
  });

  let fixedCode = '';
  process.stdout.write('  Generating fix');
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fixedCode += event.delta.text;
      process.stdout.write('.');
    }
  }
  console.log(' done');

  // Strip accidental markdown fences
  fixedCode = fixedCode
    .replace(/^```(?:tsx?|javascript|jsx?)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  writeFileSync(PAGE_PATH, fixedCode);
  console.log('  Code written to page.tsx');

  execSync('git add src/app/page.tsx', { cwd: process.cwd(), stdio: 'inherit' });
  execSync(
    `git commit -m "fix(#${issue.number}): ${issue.title}"`,
    { cwd: process.cwd(), stdio: 'inherit' },
  );
  execSync('git push origin main', { cwd: process.cwd(), stdio: 'inherit' });
  console.log('  Pushed to GitHub → Vercel deploy triggered');

  await addComment(
    issue.number,
    `✅ **Fixed and deployed!**\n\nLive at: ${VERCEL_URL}\n\n*(auto-resolved by Claude bot — claude-opus-4-6)*`,
  );
  await addLabel(issue.number);
  await closeIssue(issue.number);
  console.log(`  Issue #${issue.number} closed and labelled`);
}

async function poll(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Checking for issues assigned to "${BOT_ASSIGNEE}"...`);
  try {
    const issues = await fetchPendingIssues();
    if (issues.length === 0) {
      console.log('  No pending issues.');
      return;
    }
    for (const issue of issues) {
      await fixIssue(issue);
    }
  } catch (err) {
    console.error('  Error during poll:', err);
  }
}

async function main(): Promise<void> {
  await ensureLabel();
  console.log(`Bot started. Polling every ${POLL_INTERVAL_MS / 1000}s for issues assigned to "${BOT_ASSIGNEE}".\n`);
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main();
