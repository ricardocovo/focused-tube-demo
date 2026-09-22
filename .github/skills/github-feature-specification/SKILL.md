---
name: github-feature-specification
description: 'Create and publish a GitHub-native business feature specification as a parent issue. Use when defining feature outcomes, personas, functional requirements, measurable constraints, business risks, and success metrics before technical user-story decomposition.'
argument-hint: 'Provide owner/repo, feature name, description, and target personas.'
---

# GitHub Business Feature Specification

Create one business-facing feature specification and publish it as a GitHub issue. This skill owns the parent feature issue only. It must not create user stories or make implementation decisions.

## Required Inputs

Collect missing inputs in this order:

1. GitHub repository in `owner/repo` format.
2. Feature name.
3. Feature description, including the problem and intended value.
4. Target users or personas.

Reject empty values before accessing GitHub.

If the user requests issue categorization, also record whether to apply `type:feature` to the parent and `type:story` to generated stories. Do not ask about labels by default.

## Repository Validation

1. Run `gh auth status`.
2. Run `gh repo view {owner/repo} --json nameWithOwner,viewerPermission,hasIssuesEnabled`.
3. Stop before issue creation when authentication fails, the repository is not found, issues are disabled, or the caller cannot create and edit issues.
4. Return one actionable recovery step:
   - Authentication failure: run `gh auth login`.
   - Repository not found: verify the `owner/repo` value and repository access.
   - Issues disabled: enable GitHub Issues for the repository.
   - Insufficient permission: request permission to create and edit issues.

## Business Specification Boundary

The parent issue describes **what outcome is needed and why**. Include:

- The user or business problem.
- Goals and explicit non-goals.
- Personas and their needs.
- Testable functional requirements with stable `FR-###` identifiers.
- Measurable quality or policy constraints with stable `NFR-###` identifiers.
- Expected user experience outcomes.
- Business dependencies, risks, mitigations, and success metrics.
- Unresolved business questions.

Do not include:

- Architecture or library choices.
- API, database, event, or component designs.
- Source files, symbols, or code snippets.
- Engineering task lists or sequencing.
- Unit, integration, or end-to-end test mechanics.
- Proposed user stories.

Express security, performance, accessibility, privacy, reliability, and scalability only as measurable outcomes or constraints. Leave the implementation mechanism to the user-story generator.

## Requirement Rules

- Number functional requirements sequentially as `FR-001`, `FR-002`, and so on.
- Number non-functional constraints sequentially as `NFR-001`, `NFR-002`, and so on.
- Make each requirement independently understandable and verifiable.
- Describe externally observable behavior. Avoid combining unrelated capabilities in one requirement.
- Do not invent a constraint when the input does not support it. Record the uncertainty under Open Questions instead.

## Parent Issue Template

```markdown
# Feature: {Feature Name}

## Overview

{Two to four sentences describing the feature, target users, and primary value.}

## Problem Statement

{The current pain point, gap, or opportunity and why it matters.}

## Goals

- {Business or user outcome}
- {Business or user outcome}

## Non-Goals

- {Explicitly excluded outcome or scope}

## Target Users / Personas

| Persona | Need |
| --- | --- |
| {Persona} | {Relevant need or problem} |

## Functional Requirements

| ID | Requirement | Rationale |
| --- | --- | --- |
| FR-001 | The system shall {observable capability}. | {Why it is needed} |

## Non-Functional Requirements

| ID | Category | Measurable Constraint |
| --- | --- | --- |
| NFR-001 | {Performance / Security / Accessibility / Other} | {Observable target or policy} |

## UX Outcomes

- {Expected user flow or experience without prescribing implementation}

## Business Dependencies

| Dependency | Type | Notes |
| --- | --- | --- |
| {Dependency} | {Internal / External} | {Business relevance} |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| {Risk} | {Low / Medium / High} | {Low / Medium / High} | {Business mitigation} |

## Success Metrics

- {Metric and target}

## Open Questions

- [ ] {Question that must be resolved}

## User Stories

> Technical user stories are generated from this approved business specification.

<!-- USER-STORIES:START -->
| Story | Issue | Requirements |
| --- | --- | --- |
| Pending technical decomposition | Not created | Pending |
<!-- USER-STORIES:END -->
```

Omit an optional row or section only when it has no meaningful content. Preserve the `User Stories` heading and marker comments exactly so the story workflow can replace the table safely.

## Publish the Parent Issue

1. Generate the complete body in memory and verify it contains no technical implementation details.
2. Keep the body below GitHub's 65,536-character limit. If necessary, condense explanatory prose without removing requirements, identifiers, or open questions, and disclose the condensation in the output.
3. Write the body to a temporary Markdown file.
4. Run `gh issue create --repo {owner/repo} --title "{Feature Name}" --body-file {temp-file}`.
5. Add `--label "type:feature"` only when the user requested labels and the label exists.
6. Delete the temporary file whether creation succeeds or fails.
7. Capture the canonical issue title, number, and URL from GitHub.

For a transient GitHub or rate-limit failure, retry issue creation at most three times when GitHub indicates that an immediate retry is permitted. Otherwise stop and report GitHub's retry time or recovery instruction. Never report success without a confirmed issue URL.

## Handoff Contract

Return the following payload to the invoking agent after successful creation:

```yaml
repository: owner/repo
parentIssueNumber: 123
parentIssueUrl: https://github.com/owner/repo/issues/123
parentIssueTitle: Feature name
functionalRequirementIds:
  - FR-001
nonFunctionalRequirementIds:
  - NFR-001
storyLabelRequested: false
```

The requirement arrays must exactly match the identifiers in the published issue. Set `storyLabelRequested` to `true` only when the user requested the `type:story` label; otherwise set it to `false`. Do not invoke a story generator from this skill.

## Failure Output

On failure, return:

- The failed phase.
- The concise GitHub error.
- Whether an issue was created.
- One exact recovery action.

Do not create local specification files or directories.