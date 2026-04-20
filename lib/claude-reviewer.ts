import Anthropic from "@anthropic-ai/sdk";
import type { PullRequestContext } from "@/lib/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

function truncatePatch(patch: string, maxLength: number): string {
  if (patch.length <= maxLength) {
    return patch;
  }

  return `${patch.slice(0, maxLength)}\n...TRUNCATED...`;
}

function buildPrompt(context: PullRequestContext): string {
  const fileSummaries = context.files
    .slice(0, 60)
    .map((file) => {
      const patch = truncatePatch(file.patch, 6000);
      return [
        `FILE: ${file.filename}`,
        `STATUS: ${file.status} (+${file.additions}/-${file.deletions})`,
        "PATCH:",
        patch || "(binary or patch unavailable)"
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are a senior code reviewer for production web apps.",
    "Return concise markdown with these sections in order:",
    "1) Critical Bugs", 
    "2) Security Risks", 
    "3) Style & Maintainability", 
    "4) Test Coverage Gaps", 
    "5) Merge Recommendation",
    "Each finding must include severity (high/medium/low), affected file, and concrete fix guidance.",
    "If there are no findings in a section, write 'None found.'",
    "Keep output under 500 words.",
    "",
    `Repository: ${context.repoFullName}`,
    `Pull Request: #${context.pullNumber} - ${context.title}`,
    `Author: ${context.author}`,
    "",
    "PR Description:",
    context.body || "(no description)",
    "",
    "Changed Files:",
    fileSummaries
  ].join("\n");
}

function buildFallbackReview(context: PullRequestContext): string {
  const findings: string[] = [];
  let hasTestChanges = false;

  for (const file of context.files) {
    const patch = file.patch;

    if (file.filename.match(/(test|spec)\.(ts|tsx|js|jsx)$/i)) {
      hasTestChanges = true;
    }

    if (patch.includes("eval(")) {
      findings.push(`- high | ${file.filename} | Added \`eval()\`; replace with safe parsing/execution patterns.`);
    }

    if (patch.includes("console.log(")) {
      findings.push(`- low | ${file.filename} | \`console.log\` left in patch; remove or gate behind debug flag.`);
    }

    if (patch.includes("TODO") || patch.includes("FIXME")) {
      findings.push(`- medium | ${file.filename} | TODO/FIXME introduced; create a ticket and avoid shipping unfinished behavior.`);
    }

    if (patch.includes("password") && !file.filename.toLowerCase().includes("test")) {
      findings.push(`- medium | ${file.filename} | Password-related logic changed; verify secrets never log and are validated server-side.`);
    }
  }

  if (!hasTestChanges && context.files.some((file) => file.filename.startsWith("app/") || file.filename.startsWith("lib/"))) {
    findings.push("- medium | (cross-cutting) | Application logic changed without test updates; add regression tests for new code paths.");
  }

  const issues = findings.length > 0 ? findings.join("\n") : "None found.";

  return [
    "## Critical Bugs",
    issues,
    "",
    "## Security Risks",
    issues,
    "",
    "## Style & Maintainability",
    issues,
    "",
    "## Test Coverage Gaps",
    hasTestChanges ? "None found." : "- medium | tests | No test files changed in this PR; add coverage for the modified behavior.",
    "",
    "## Merge Recommendation",
    findings.length > 0
      ? "Needs changes before merge. Address high/medium findings, then rerun review."
      : "Looks safe to merge after CI passes."
  ].join("\n");
}

export async function generatePullRequestReview(context: PullRequestContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallbackReview(context);
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = buildPrompt(context);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.1,
      system:
        "You are PR Review AI. Prioritize correctness, security, and actionable guidance. Be direct and specific.",
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }

        return "";
      })
      .join("\n")
      .trim();

    return text || buildFallbackReview(context);
  } catch {
    return buildFallbackReview(context);
  }
}
