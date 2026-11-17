// The document the editor opens with: a little of everything the preview renders.

export const SAMPLE = `# Release checklist

Write the notes in **Markdown** and watch the _preview_ follow as you type.

## Before the release

- Run \`pnpm test\` on a clean checkout
- Read the *migration* section twice
- Tag the commit

## Commands

\`\`\`
pnpm build
pnpm publish --tag next
\`\`\`

1. Open the release page
2. Paste the notes
3. Press **Publish**

HTML stays text here: <b>not bold</b>.
`;
