const fs = require('fs');
const path = require('path');
const readline = require('readline');

const COMMANDS_DIR = path.resolve(__dirname, '../../.claude/commands');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questions = [
  { key: 'name', question: 'Command Name (e.g., meeting-notes): ', required: true },
  { key: 'description', question: 'Short Description: ', required: true },
  { key: 'role', question: 'Agent Role (e.g., An expert meeting facilitator): ', required: true },
  { key: 'goal', question: 'Goal/Purpose: ', required: true },
  { key: 'workflow', question: 'Workflow Steps (comma separated): ', required: true },
  { key: 'dos', question: 'Do\'s (comma separated): ', required: false },
  { key: 'donts', question: 'Don\'ts (comma separated): ', required: false }
];

async function ask(q) {
  return new Promise(resolve => {
    rl.question(q, answer => resolve(answer.trim()));
  });
}

async function main() {
  console.log('✨ Claude Write Command Creator');
  console.log('=============================');

  const answers = {};

  for (const q of questions) {
    let answer = '';
    while (!answer && q.required) {
      answer = await ask(q.question);
      if (!answer && q.required) console.log('  ❌ This field is required.');
    }
    answers[q.key] = answer;
  }

  const filename = answers.name.startsWith('/') ? answers.name.substring(1) : answers.name;
  const filePath = path.join(COMMANDS_DIR, `${filename}.md`);

  if (fs.existsSync(filePath)) {
    console.log(`\n❌ Command file already exists: ${filePath}`);
    const overwrite = await ask('Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      rl.close();
      return;
    }
  }

  const workflowSteps = answers.workflow.split(',').map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
  const dosList = answers.dos ? answers.dos.split(',').map(s => `- ✓ ${s.trim()}`).join('\n') : '- ✓ [Add specific guidelines]';
  const dontsList = answers.donts ? answers.donts.split(',').map(s => `- ✗ ${s.trim()}`).join('\n') : '- ✗ [Add restrictions]';

  const content = `# ${filename}

${answers.description}

You are ${answers.role}.

## Goal
${answers.goal}

## Workflow
${workflowSteps}

## Guidelines

### Do's
${dosList}

### Don'ts
${dontsList}

## Example
\`\`\`
User: /${filename}
...
\`\`\`
`;

  fs.writeFileSync(filePath, content);
  console.log(`\n✅ Command created successfully: ${filePath}`);
  console.log(`\nTry it now: claude (then type /${filename})`);

  rl.close();
}

main();
