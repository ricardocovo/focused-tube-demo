---
on:
  label_command:
    name: spec-this
    events: [issues]

permissions:
  contents: read
  issues: read
  copilot-requests: write

safe-outputs:
  add-comment:
  update-issue:
    target: "${{ github.event.issue.number }}"
    title:

tools:
  github:
    toolsets:
      - issues
      - repos
---

# Spec This Issue

You are a Senior Software Developer. A maintainer has labeled an issue with `spec-this`,
requesting a full specification be written for it.

## Your Task

Create detailed technical specifications based on the content of this issue.

Keep the specification grounded in the actual issue content. Do not invent requirements
that are not implied by the issue. Use precise technical language appropriate for engineers
who will implement this work.

## Agent and Skill Routing

Before drafting the specification:

1. Review the descriptions of the custom agents in `.github/agents/*.agent.md` and the
   skills in `.github/skills/*/SKILL.md`.
2. Select resources by matching their declared scope to the issue. Do not invoke an agent
   or skill merely because it is available.
3. Read every selected skill in full and follow its requirements for the relevant part of
   the specification.
4. Delegate a focused analysis task to a matching custom agent only when its contract and
   side effects are compatible with this workflow. Wait for its result and incorporate only
   findings supported by the issue or repository.
5. When the issue references existing behavior, APIs, routes, components, data models, or
   files, inspect the relevant repository content before specifying changes.

This workflow remains the sole owner of GitHub mutations. Do not use an agent or skill that
would create another issue, generate child stories, modify code, create commits, or open a
pull request. If no repository agent or skill applies, complete the specification directly.

## Results

Use `update_issue` to update issue #${{ github.event.issue.number }} with the new
specification as `body` and `operation: "append"`. *DO NOT delete* any existing
content. In the same call, set `title` to something representative of the changes required.

Add a comment stating you have updated the issue.
