# Claude Write Distribution Design

## Problem Statement
Currently, users install Claude Write by cloning the git repository. This results in users inheriting the entire development history of the tool, which is unnecessary and confusing for their personal knowledge base. Users need a "clean slate" workspace that is version-controlled separately (or not at all) from the tool's source code.

## Goals
1.  **Clean Workspace**: Users start with a fresh git repository (or none).
2.  **Easy Updates**: Users can easily update the tool scripts and templates without conflicts.
3.  **Separation of Concerns**: User content (markdown files) should be separate from Tool code (scripts, config).
4.  **Low Friction**: Installation should be as simple as `npm init claude-write` or similar.

## Options Analysis

### Option 1: `degit` (Recommended for MVP)
Use `degit` to download the repository without git history.
- **Pros**: Simple, no new infrastructure needed, works with existing repo.
- **Cons**: Updates are harder (no `git pull`).
- **Command**: `npx degit fengluo/claude-write my-knowledge-base`

### Option 2: CLI Tool (`npm init claude-write`)
Publish a CLI tool to npm that scaffolds the project.
- **Pros**: Professional feel, can ask setup questions (interactive), clean installation.
- **Cons**: Requires publishing to npm registry.
- **Implementation**:
    - Create `create-claude-write` package.
    - Script copies template files to target directory.
    - Script initializes fresh git repo.

### Option 3: Separate "Starter Template" Repo
Maintain a separate `claude-write-starter` repo.
- **Pros**: GitHub "Use this template" button works great.
- **Cons**: Maintenance burden (syncing changes between tool repo and starter repo).

### Option 4: Install Script (curl | bash)
Like Homebrew or nvm.
- **Pros**: Universal on Unix systems.
- **Cons**: Security concerns for some users, harder to maintain cross-platform (Windows).

## Proposed Solution: The "Hybrid" Approach

We will aim for **Option 2 (CLI Tool)** as the primary method, but support **Option 1 (degit)** as a fallback.

### Architecture

1.  **Refactor Project Structure**:
    - Ensure `scripts/`, `.claude/`, `.vscode/`, and `06_Meta/` are self-contained.
    - Identify "User Content" directories (`00_Inbox` to `05_Attachments`) vs "System" directories.

2.  **Distribution Mechanism**:
    - Create a `bin/cli.js` in the current repo.
    - Add `bin` entry to `package.json`.
    - Allow users to run `npx claude-write create <directory>`.

3.  **Update Strategy**:
    - Build an `upgrade` command (already in P1 plan) that fetches the latest scripts/templates and intelligently merges them.

## Implementation Steps

1.  **Prepare `package.json`**: Add `bin` entry.
2.  **Create CLI Entry Point**: Write `bin/cli.js` that handles:
    - Cloning/Copying files.
    - Removing `.git` directory.
    - initializing new `git init`.
    - Running `npm install`.
    - Running `npm run init`.
3.  **Documentation**: Update README with installation instructions.

## Decision
We will implement a local CLI script first that simulates the `npx` behavior, allowing us to test the flow. Then we can publish to npm later.

**Immediate Action**:
1. Create `bin/claude-write.js`.
2. Update `package.json` to expose it.
3. Test the "scaffold new project" flow.
