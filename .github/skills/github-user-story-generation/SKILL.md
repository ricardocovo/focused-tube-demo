---
name: github-user-story-generation
description: 'Generate and publish implementation-ready GitHub user stories from a business feature issue. Use for repository-grounded technical decomposition, requirement traceability, acceptance criteria, engineering tasks, dependencies, validation work, sub-issue linking, or resuming partial story creation.'
argument-hint: 'Provide owner/repo and a parent feature issue number or URL.'
---

# GitHub Technical User Story Generation

Turn one published business feature specification into 3-8 implementation-ready user story issues. This skill owns technical decomposition, story publication, and parent-child linking. It must not change the feature's business intent.

## Required Inputs

- GitHub repository in `owner/repo` format.
- Parent feature issue number or URL.
- Whether the optional `type:story` label was requested.

The parent issue is canonical. Any handoff payload is a locator and consistency check, not a substitute for reading the issue.

## Validate and Load the Parent

1. Run `gh auth status`.
2. Run `gh repo view {owner/repo} --json nameWithOwner,viewerPermission,hasIssuesEnabled`.
3. Read the parent with `gh issue view {number} --repo {owner/repo} --json number,title,url,body,state`.
4. Stop when the issue is closed, unavailable, lacks a business specification, or does not contain functional requirement identifiers.
5. Extract every `FR-###` and `NFR-###` identifier directly from the current issue body. If identifiers supplied by the handoff differ, report the mismatch and use the published issue only after the discrepancy is resolved.

## Resume Without Duplicates

Before generating or creating issues, inventory existing child stories from all available sources:

1. The marked table under the parent issue's `User Stories` section.
2. GitHub sub-issues, when the repository supports the sub-issues API.
3. Parent comments that link story issues.
4. Open and closed issues whose bodies contain `<!-- PARENT-FEATURE: {owner/repo}#{parent-number} -->`.

Each generated story must have a stable marker:

```markdown
<!-- STORY-KEY: {parent-number}:{stable-kebab-case-key} -->
```

Reuse a previously published story when its parent marker and story key match. Never create a second issue for the same key. Include reused issues in dependency links and the final parent table.

## Ground Stories in the Repository

Inspect only enough of the workspace to identify the implementation boundaries implied by the feature:

1. Read applicable repository instructions and architecture documentation.
2. Locate the closest existing route, service, component, hook, model, or configuration that controls each requirement.
3. Read neighboring tests and call sites to infer established patterns and validation commands.
4. Record concrete paths and symbols. Mark a path as `new` when the story requires a new file but its final name is not yet established.

Do not invent APIs, schemas, dependencies, or filenames when repository evidence is missing. Capture unresolved technical decisions under Notes and make them explicit blockers when implementation cannot proceed safely.

## Decompose the Feature

Create 3-8 stories that collectively implement the parent specification.

- Each story must deliver a coherent, reviewable outcome.
- Prefer vertical behavior slices over separate frontend, backend, or test-only stories when they can be implemented together safely.
- Split stories when independent work can proceed in parallel or when one story would span unrelated ownership boundaries.
- Identify predecessor stories and shared contracts before issue creation.
- Do not add business behavior that is absent from the parent issue.
- Do not weaken, reinterpret, or silently omit an `FR-###` or applicable `NFR-###` requirement.

Build an in-memory coverage matrix before publishing. Every functional requirement and every applicable non-functional requirement must map to at least one story. If coverage is incomplete, revise the decomposition before creating any issue.

## Story Issue Template

```markdown
<!-- PARENT-FEATURE: {owner/repo}#{parent-number} -->
<!-- STORY-KEY: {parent-number}:{stable-kebab-case-key} -->

# User Story: {Title}

## Summary

**As a** {persona},
**I want** {goal or capability},
**so that** {benefit or outcome}.

## Parent Feature and Requirements

- Parent: {parent-issue-url}
- Covers: `FR-001`, `NFR-001`

## Description

{Scope, relevant behavior, and boundaries for this implementation slice.}

## Acceptance Criteria

- [ ] Given {context}, when {action}, then {observable outcome}.
- [ ] Given {context}, when {action}, then {observable outcome}.

## Technical Approach

- {Repository-grounded design, contract, data flow, or error behavior.}
- {Compatibility, migration, quota, security, or accessibility consideration.}

## Affected Areas

| Area | Files or Symbols | Change |
| --- | --- | --- |
| {Client / Server / Data / Configuration} | `{path or symbol}` | {Expected modification} |

## Tasks

- [ ] {Action-oriented implementation task}
- [ ] {Action-oriented implementation task}

## Validation

- [ ] {Focused automated test or executable check}
- [ ] {Acceptance-criteria verification}

## Dependencies

- Depends on: {Story title or `None`}
- Enables: {Story title or `None`}

## Out of Scope

- {Explicit exclusion}

## Notes

- {Open technical question, assumption, or operational note}
```

## Story Quality Gate

Before publishing, verify every story:

- References at least one parent requirement.
- Uses observable Given/When/Then acceptance criteria.
- Names repository evidence in Technical Approach and Affected Areas.
- Contains implementable tasks and executable validation work.
- Declares dependencies and exclusions explicitly.
- Is small enough to implement and review independently.
- Introduces no unapproved business requirement.

Also verify that the complete story set covers every parent `FR-###` and applicable `NFR-###` identifier.

## Publish and Link Stories

Create stories in dependency order:

1. Write each body to a temporary Markdown file.
2. Run `gh issue create --repo {owner/repo} --title "{Story Title}" --body-file {temp-file}`.
3. Add `--label "type:story"` only when requested and the label exists.
4. Delete each temporary file whether creation succeeds or fails.
5. Capture the issue number and URL before creating the next story.
6. After all issue numbers are known, replace dependency titles in each issue body with issue links where possible.

For each new or reused story, attempt to attach it as a GitHub sub-issue of the parent. A supported CLI sequence is:

```powershell
$subIssueId = gh api repos/{owner}/{repo}/issues/{story-number} --jq .id
gh api --method POST repos/{owner}/{repo}/issues/{parent-number}/sub_issues -F sub_issue_id=$subIssueId
```

Treat an existing parent-child relationship as success. If the sub-issues API is unavailable, preserve discoverability with both fallbacks:

- Add one comment to each story that links the parent feature issue, unless that reference already exists.
- Add one parent comment listing all successfully created or reused story links, unless those links already exist.

Do not claim that comment links are GitHub sub-issues.

## Update the Parent Issue

Replace only the content between `<!-- USER-STORIES:START -->` and `<!-- USER-STORIES:END -->` with the complete successful story inventory:

```markdown
<!-- USER-STORIES:START -->
| Story | Issue | Requirements |
| --- | --- | --- |
| {Story title} | [#{issue-number}]({issue-url}) | `FR-001`, `NFR-001` |
<!-- USER-STORIES:END -->
```

Preserve every other byte of the business specification. If the markers are missing, update only the table under `## User Stories`; do not rewrite another section. Use `gh issue edit` with a temporary body file and delete that file afterward.

Update the table after each successfully created story when a later failure would otherwise leave it undiscoverable. Finish with one complete table after all stories are linked.

## Failure and Retry Behavior

- Retry a transient GitHub creation failure at most three times when GitHub indicates that an immediate retry is permitted. Otherwise report the retry time or exact recovery action.
- On partial failure, stop creating dependent stories, preserve all successful issues, update the parent table with those issues, and report created, reused, failed, and blocked stories separately.
- Never delete an issue to simulate rollback.
- On rerun, resume from the existing story inventory and create only missing story keys.
- Never report full success while a parent requirement is uncovered or a created issue is absent from the parent table.

## Output Contract

Return a compact result to the invoking agent:

```yaml
parentIssue: https://github.com/owner/repo/issues/123
subIssueLinking: native
created:
  - title: Story title
    number: 124
    url: https://github.com/owner/repo/issues/124
reused: []
failed: []
blocked: []
coveredRequirements:
  - FR-001
  - NFR-001
```

Use `subIssueLinking: comments` when the API fallback was required. Do not create local specification files or directories.