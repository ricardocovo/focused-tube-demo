---
description: |
  Reviews documentation changed by pull requests targeting main and posts the
  findings as a pull request comment before merge.

on:
  workflow_dispatch:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    branches: [main]

# Permissions - what can this workflow access?
# Write operations (creating issues, PRs, comments, etc.) are handled
# automatically by the safe-outputs job with its own scoped permissions.
permissions:
  contents: read
  pull-requests: read

tools:
  github:
    toolsets: [pull_requests, repos]

# Network access
network: defaults

safe-outputs:
  add-comment:
    max: 1

---

## Purpose

This agent checks the project's documentation files to ensure they accurately reflect the project's structure, technology stack, architecture, development workflow, coding standards, and testing approaches.

**DO NOT CREATE, EDIT, OR DELETE FILES. Post the complete report as a comment on the triggering pull request.**

## Targets

Ensure the README.md files in the following locations are comprehensive and well-structured:
- `root` directory
- `src/**` directory (consider all subdirectories)
- `infra/` directory
- `test/` directory

## Audit Instructions

*For each README.md file in the target locations, perform the following checks:*

Check that the Format should with proper Markdown, including:
- Clear headings and subheadings
- Code blocks where appropriate
- Lists for better readability
- Links to other documentation files
- Badges for build status, version, etc. if information is available

## Documentation Grade
Generate an overall grade for the documentation based on the completeness and quality of the README.md files audited. Use a scalar from 0 to 100, where 100 represents perfect documentation with all required sections complete and well-written.

### Grade Distribution

* 98-100: (Exceptional)
* 95-97:  (Excellent)
* 88-94: (Good)
* 85-87: (Acceptable)
* <85: (Needs Work)

## README Sections

README.md files should include the sections below. You can run a comparison against existing documentation files to identify missing or incomplete sections. If the section exist and there is content on it, we can consider it complete, however, the quality of the content should also be evaluated and checked for completeness against the project it self.

### Project Name and Description
- Extract the project name and primary purpose from the documentation
- Include a concise description of what the project does

### Technology Stack (MUST HAVE)
- List the primary technologies, languages, and frameworks used
- Include version information when available
- Source this information primarily from the Technology_Stack file

### Project Architecture (MUST HAVE)
- Provide a high-level overview of the architecture
- Consider including a simple diagram if described in the documentation
- Source from the Architecture file

### Getting Started (MUST HAVE)
- Include installation instructions based on the technology stack
- Add setup and configuration steps
- Include any prerequisites

### Project Structure (MUST HAVE)
- Brief overview of the folder organization
- Source from Project_Folder_Structure file

### Key Features (MUST HAVE)
- List main functionality and features of the project
- Extract from various documentation files

### Development Workflow (MUST HAVE)
- Summarize the development process
- Include information about branching strategy if available
- Source from Workflow_Analysis file

### Coding Standards (MUST HAVE)
- Summarize key coding standards and conventions
- Source from the Coding_Standards file

### Testing (MUST HAVE)
- Explain testing approach and tools
- Source from Unit_Tests file

### Contributing (OPTIONAL)
- Guidelines for contributing to the project
- Reference any code exemplars for guidance
- Source from Code_Exemplars and copilot-instructions

### License (OPTIONAL)
- Include license information if available

### Diagrams (OPTIONAL)
- If any architecture or workflow diagrams are described in the documentation, include them in the README with appropriate captions.
- Use mermaid syntax for diagrams if applicable.

## Results

Ensure all reports are clear, concise, and formatted in Markdown for easy readability.

Remember, the MUST HAVE Sections are:
- Project Name and Description
- Technology Stack
- Project Architecture
- Getting Started
- Project Structure
- Key Features
- Development Workflow
- Coding Standards
- Testing

**BE AWARE OF THIS EXCEPTIONS:**
* The `/test/README.md` file does not require the "Project Architecture" section.

For each README.md file audited, include a detailed subsection in the pull request comment with:

  * File path of the file being reported on.
  * Documentation Grade (0-100)
  * A Table with one row for each required section. Each row will have this coluns:
    * Section Name
    * Status: "Present", "Missing", or "Incomplete".
    * Notes: For "Incomplete" sections, provide a brief explanation of what is missing or needs improvement.
  * We DO NOT NEED to include any content if the section is "Present" or "Missing".
  * If *any of the  "MUST HAVE"* sections mentioned above have are any "Missing" or "Incomplete" sections, you **MUST do all the following**:
    * Add this exact phrase to line 1 of the pull request comment: `DOCUMENTATION-NEEDS-WORK`.
    * Create a TODO list to fix only the Missing and Incomplete sections.

The same pull request comment must also include:

  * A table summarizing the documentation grades for all audited README.md files.
  * A list of common issues found across multiple files.
  * Recommendations for improving overall project documentation quality.

Call `add_comment` exactly once with the complete Markdown report. Do not create issues,
review comments, commits, branches, pull requests, artifacts, or repository files. If no
README.md files exist in the target locations, state that in the comment and score the
overall documentation as 0/100.

## Pull Request Comment Format

The pull request comment contains the sections in the following sample and nothing else,
apart from the conditional `DOCUMENTATION-NEEDS-WORK` first line and per-file audit
subsections placed before the grades summary.

```md
# Documentation Summary Report

**Project:** GhcSamplePs - Soccer Player Statistics Tracker
**Report Date:** January 7, 2026
**Auditor:** Documentation-Reporter Agent

---

## Executive Summary

The GhcSamplePs project demonstrates **EXCEPTIONAL DOCUMENTATION QUALITY** across all major areas. The project documentation is comprehensive, well-structured, and serves as an exemplary model for other projects. All README files audited are above 88/100, with three scoring 96-98/100.

**Overall Project Documentation Grade: 95/100**

---

## Documentation Grades Summary

| Location | File | Grade | Status | Primary Gaps |
|----------|------|-------|--------|--------------|
| **Root** | [README.md](README.md) | **98/100** | ✅ Exceptional | Minor: License detail |
| **src/** | [README.md](src/README.md) | **96/100** | ✅ Excellent | Getting Started at src level |
| **infra/** | [README.md](infra/README.md) | **97/100** | ✅ Exceptional | Contributing guidelines |
| **tests/** | [README.md](tests/GhcSamplePs.Core.Tests/README.md) | **88/100** | ✅ Good | Architecture, Contributing |

### Grade Distribution

- **98-100 (Exceptional):** 1 file (Root)
- **95-97 (Excellent):** 2 files (src, infra)
- **88-94 (Good):** 1 file (tests)
- **85-87 (Acceptable):** 0 files
- **<85 (Needs Work):** 0 files
```

- Run `gh aw compile` to generate the GitHub Actions workflow
- See https://github.github.com/gh-aw/ for complete configuration options and tools documentation
