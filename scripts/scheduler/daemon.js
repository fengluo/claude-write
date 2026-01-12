const cron = require('node-cron');
const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Load Configuration
const CONFIG_PATH = path.resolve(__dirname, '../../.claude/config.json');
let config = {};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
} catch (error) {
  console.error('Error loading config:', error.message);
}

// Defaults
const SCHEDULE = config.scheduler || {
  daily_review: '0 21 * * *',     // 9 PM daily
  weekly_synthesis: '0 18 * * 0', // 6 PM Sunday
  auto_sync: '0 */4 * * *'        // Every 4 hours
};

const FEATURES = config.features || {
  auto_sync: true,
  daily_review_reminder: true
};

console.log('⏰ Claude Write Scheduler Started');
console.log('================================');

// Helper to send notification
function notify(title, message, wait = false) {
  console.log(`[${new Date().toLocaleTimeString()}] Notification: ${title} - ${message}`);
  notifier.notify({
    title: title,
    message: message,
    sound: true,
    wait: wait,
    appID: 'Claude Write'
  });
}

// 1. Daily Review Reminder
if (FEATURES.daily_review_reminder) {
  console.log(`📅 Daily Review scheduled: ${SCHEDULE.daily_review}`);
  cron.schedule(SCHEDULE.daily_review, () => {
    notify(
      'Daily Review Time',
      'Time to reflect on your day! Run /daily-review to start.',
      true
    );
  });
}

// 2. Weekly Synthesis Reminder
console.log(`📅 Weekly Synthesis scheduled: ${SCHEDULE.weekly_synthesis}`);
cron.schedule(SCHEDULE.weekly_synthesis, () => {
  notify(
    'Weekly Synthesis',
    'Wrap up your week and plan ahead. Run /weekly-synthesis.',
    true
  );
});

// 3. Auto Sync
if (FEATURES.auto_sync) {
  console.log(`🔄 Auto Sync scheduled: ${SCHEDULE.auto_sync}`);
  cron.schedule(SCHEDULE.auto_sync, () => {
    console.log(`[${new Date().toLocaleTimeString()}] Running Auto Sync...`);

    const scriptPath = path.resolve(__dirname, '../git/auto-sync.js');
    exec(`node "${scriptPath}" --auto`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Sync error: ${error.message}`);
        notify('Sync Failed', 'Automatic git sync encountered an error.');
        return;
      }
      if (stdout.includes('Everything up-to-date') || stdout.includes('Already up to date')) {
        // Silent success
      } else {
        // notify('Sync Completed', 'Workspace successfully synced.');
        console.log('Sync output:', stdout);
      }
    });
  });
}

console.log('\nRunning in background... (Press Ctrl+C to stop)');
