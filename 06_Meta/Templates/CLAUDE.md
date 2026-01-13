---
title: Claude Code Configuration
type: system-config
status: active
tags: [claude, config]
created: {date}
updated: {date}
---

# Claude Code Configuration

## Project Information
This is a **Claude Write** workspace, designed for AI-assisted content creation and knowledge management using the PARA method.

### Directory Structure
- `00_Inbox/`: Temporary holding area for new ideas and unprocessed inputs
- `01_Projects/`: Active projects with specific goals and deadlines
- `02_Areas/`: Ongoing responsibilities and areas of interest
- `03_Resources/`: Reference materials, assets, and knowledge base
- `04_Archive/`: Completed or inactive items
- `05_Attachments/`: Images, PDFs, and other binary files
- `06_Meta/`: Templates, documentation, and system files

## Commands
- `/thinking-partner`: Explore ideas and connect concepts
- `/quick-capture`: Rapidly save thoughts to Inbox
- `/inbox-processor`: Organize and triage Inbox items
- `/research-assistant`: Deep dive into topics and generate outlines
- `/daily-review`: Daily reflection and activity tracking
- `/weekly-synthesis`: Weekly review and strategic planning
- `/draft-content`: Turn outlines into full drafts
- `/de-ai-ify`: Make AI text sound more human

## User Preferences

### Output Style
- **Language**: Chinese (Simplified) unless requested otherwise
- **Tone**: Professional, objective, yet conversational
- **Format**: Markdown with clear hierarchy

### Collaboration Rules
1. **Link First**: Always try to link to existing notes using `[[WikiLink]]` format.
2. **Atomic Notes**: Keep notes focused on a single concept or topic when possible.
3. **Source Citing**: When referencing external information, provide sources.
4. **No Hallucinations**: clearly state when you are unsure or making an assumption.

## Development
- Use `npm run` to execute automation scripts
- Check `.claude/commands/` for custom command definitions
