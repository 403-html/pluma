---
name: handling-review-feedback
description: How the lead agent processes PR review comments — triages feedback, updates skills/agents/instructions when guidance is wrong or incomplete, and feeds corrections back into the team knowledge base
---

This skill defines the mandatory process for handling PR review feedback. It covers two distinct scenarios: feedback that requires a code fix, and feedback that reveals a gap or error in the Copilot assets themselves (skills, agent files, or `copilot-instructions.md`).

## Two Types of Feedback

| Type | Description | Action |
|---|---|---|
| **Code feedback** | Reviewer requests a change to source code, tests, or configuration | Delegate to the responsible agent; do not update Copilot assets unless a pattern emerges |
| **Guidance feedback** | Reviewer contradicts, corrects, or extends a skill / agent instruction / copilot-instructions rule | Update the Copilot asset AND implement the code fix together |

## Step 1: Triage Each Comment

For every review comment, answer:

1. **Is the reviewer correcting behaviour that a skill, agent, or instruction explicitly prescribes?**
   → Guidance feedback. Proceed to Step 2.

2. **Is the reviewer identifying a case that no skill, agent, or instruction covers?**
   → Missing guidance. Proceed to Step 2.

3. **Is the reviewer requesting a code change that is consistent with all existing guidance?**
   → Code feedback only. Delegate to the responsible subagent. Skip Step 2.

When in doubt, treat the feedback as guidance feedback. It is better to over-update assets than to repeat the same mistake.

## Step 2: Update the Copilot Asset

Identify the asset that should encode the corrected behaviour:

| What was wrong | Asset to update |
|---|---|
| Incorrect command or script | Relevant skill (`*.github/skills/*/SKILL.md`) |
| Missing step in a workflow | Relevant skill |
| Wrong agent behaviour / rule | Relevant agent file (`.github/agents/*.agent.md`) |
| Wrong repo-wide convention or rule | `.github/copilot-instructions.md` |
| Missing skill (no asset covers this at all) | Create a new skill under `.github/skills/<name>/SKILL.md` |

**Rules for asset updates:**
- Make the smallest possible change that encodes the correct behaviour.
- Prefer adding a clarification or failure-mode entry over rewriting a section.
- If a step was wrong, fix it and add a "Common Failure Signatures" or "Prohibited Actions" entry so future agents don't repeat it.
- If a new skill is warranted, follow the existing SKILL.md format: YAML frontmatter (`name`, `description`), then `## When to Invoke This Skill` at the end.

## Step 3: Implement the Code Fix

After (or in parallel with) updating the asset, delegate the code fix to the responsible subagent using the standard delegation payload. Reference the updated asset in the delegation so the subagent uses the corrected guidance:

```
{
  "context": "Review feedback on PR #<N> — <brief description>",
  "objective": "<exact code change required>",
  "acceptance_criteria": ["<measurable outcome>"],
  "constraints": ["Follow the updated `<skill-name>` skill — it was corrected in this PR"]
}
```

## Step 4: Validate the Fix

Run the `pre-review-checklist` skill after every code change from review feedback, regardless of how small the change is.

## Step 5: Respond to the Reviewer

Once both the code fix and the asset update are pushed:

1. Confirm the fix addresses the comment.
2. Note which asset was updated if guidance changed.
3. Mark the conversation as resolved only after the fix is verified (CI green, `pre-review-checklist` passes).

## Common Review Feedback Patterns and Their Asset Fixes

| Feedback pattern | Asset to update | Example fix |
|---|---|---|
| "This command is wrong / doesn't work" | Relevant skill | Correct the command; add a "Common Failure Signatures" row |
| "We don't do it this way here" | `copilot-instructions.md` or agent file | Add the correct convention; add a "Prohibited Actions" entry |
| "This is missing a required step" | Relevant skill | Insert the missing step in sequence |
| "Agent X should do Y, not Z" | `agents/<x>.agent.md` | Update the Standards or When Assigned a Task section |
| "This pattern causes [problem]" | Relevant skill | Add the problem to the "Common Failure Signatures" table with a fix |
| "There's no guidance for this situation" | Create or extend a skill | Add the missing situation as a new `## When...` or `## Step` section |

## When to Invoke This Skill

Invoke this skill when:
- A PR receives a review comment that contradicts or goes beyond existing Copilot assets
- A reviewer corrects a command, step, or convention that a skill currently encodes differently
- A reviewer identifies a missing workflow or missing guardrail
- The same feedback has been given on more than one PR (strong signal: update the asset immediately)
- Any review comment contains phrases like "we always", "you should never", "the correct way is", or "this is wrong"
