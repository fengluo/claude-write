# Scheduled Tasks System Design

## Problem Statement
Knowledge management requires consistency. Users often forget to perform routine maintenance tasks like daily reviews, weekly synthesis, or backing up their vault. A scheduled task system will provide gentle nudges and automation to keep the system healthy.

## Goals
1.  **Reliability**: Tasks run at the expected time.
2.  **Flexibility**: Users can configure what runs and when.
3.  **Visibility**: Users are notified when a task is due or completed.
4.  **Low Resource Usage**: Shouldn't drain battery or hog CPU.

## Use Cases
1.  **Daily Review Reminder**: "It's 9 PM, time for your daily review."
2.  **Weekly Synthesis Reminder**: "It's Sunday evening, let's wrap up the week."
3.  **Automated Backup**: Run `git push` every 4 hours.
4.  **Inbox Health Check**: Notify if inbox has > 10 items.
5.  **Activity Report**: Generate a weekly activity report automatically.

## Technical Architecture Options

### Option 1: VSCode Extension (Ideal but Heavy)
Build a full VSCode extension that uses `setInterval` or alarms.
- **Pros**: Integrated UI, notifications inside VSCode.
- **Cons**: Only works when VSCode is open.

### Option 2: System Cron / Launchd (Reliable but Complex)
Generate crontab entries or macOS launchd plists.
- **Pros**: Runs in background even if VSCode is closed.
- **Cons**: Hard to configure/debug for average users; OS-dependent.

### Option 3: Daemon Process (pm2 / node-forever)
Run a background node process.
- **Pros**: Cross-platform.
- **Cons**: Requires managing a background process.

### Option 4: "Check-on-Activity" (Lazy Evaluation) - **Recommended MVP**
Instead of a true background daemon, check for due tasks whenever the user interacts with the system (e.g., runs a command, opens a terminal, or explicitly runs `npm run check-tasks`).
- **Pros**: Zero background resource usage, simplest to implement.
- **Cons**: Passive; relies on user trigger.

### Option 5: Hybrid Approach (CLI + System Integration)
Provide a command `npm run daemon:start` that uses `node-cron` to schedule tasks while the terminal is open, or can be hooked into system startup.

## Proposed Solution: The "CLI Daemon"

We will implement **Option 5** using `node-cron`.

1.  **Configuration**: Defined in `.claude/config.json`.
    ```json
    "scheduler": {
      "daily_review": "0 21 * * *",     // 9 PM daily
      "weekly_synthesis": "0 18 * * 0", // 6 PM Sunday
      "auto_sync": "0 */4 * * *"        // Every 4 hours
    }
    ```

2.  **The Daemon Script**: `scripts/scheduler/daemon.js`
    - Loads config.
    - Uses `node-cron` to schedule jobs.
    - Sends system notifications (using `node-notifier`).

3.  **Integration**:
    - Users can run `npm run daemon` in a background terminal.
    - Or we provide a setup script to install it as a system service (future).

## Implementation Plan

1.  **Dependencies**: Install `node-cron` and `node-notifier`.
2.  **Script**: Create `scripts/scheduler/daemon.js`.
3.  **Notification**: Implement cross-platform system notifications.
4.  **Commands**: Add `daily-reminder`, `weekly-reminder` tasks.

## User Experience

User runs:
```bash
npm run daemon
```
Output:
```
⏰ Scheduler started.
- Daily Review: scheduled for 21:00
- Weekly Synthesis: scheduled for Sunday 18:00
...
```

When time comes:
- A system notification pops up: "Time for Daily Review! Run /daily-review".
- If configured, `git sync` runs silently in background.
