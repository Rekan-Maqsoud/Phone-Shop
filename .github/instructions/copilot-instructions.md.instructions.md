---
applyTo: '**'
---
Coding standards, domain knowledge, and preferences that AI should follow.
# Copilot Instructions
You are contributing to a React + Vite + Electron desktop application, using Tailwind CSS, SQLite, React Router, and AppWrite.

⚙️ Execution Rules
Do Not Narrate. Just Act.
Do not say “Let me,” “I will,” or describe what you’re about to do. Simply perform the required modifications. All responses must be direct and silent in tone, focusing on code only.

Modify, Don’t Rewrite
Apply changes by editing existing code. Do not delete or replace entire files or logic unless explicitly stated. Preserve structure and functionality.

No Placeholders, No TODOs
Implement complete, final solutions. Leave no unfinished tasks, comments, or assumptions. All code must be ready for production.

One Task at a Time
Solve a single issue per pass. After completing and verifying it, proceed to the next. Do not batch solutions.

Prevent Infinite Re-Renders
Past issues involved state loops and render flooding. Ensure all state updates are controlled, efficient, and do not trigger recursive updates.