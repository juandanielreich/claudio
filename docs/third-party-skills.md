# Reference: finding and installing third-party skills

Pointed to from `CLAUDE.md` § Agent system.

There is a public registry of Claude Code skills, browsable from the command line with `npx skills`. Using it is fine. Letting it write into your config without asking is not, and the failure is quiet.

---

**`npx skills find`, and installs go to the project.** When the user asks "find me a skill that does XYZ" (or "is there a skill for this?"), run `npx skills find "<query in English>"` and show the candidates with what they do, which repo they come from, and how many installs they have. Inside an agent the command detects there is no interactive terminal and prints the results directly, so it works as-is from Bash.

- **Installing is the user's decision, one skill at a time, and by default into the project**, not the global config: `npx skills add <owner/repo@skill> -a claude-code -y` from the project folder puts it in that project's `.claude/skills/`, where it exists only there. The `-g` flag would make it global and place it next to your own skills. Ask about that separately; never assume it.
- **`-a claude-code` is not optional.** The CLI uses `~/.agents/skills/` as the canonical location and links from there to each agent. Without that flag the skill can stay only in the canonical location, which Claude Code does not read, and nothing reports an error. After every `add`, check that the file reached its destination.
- **`npx skills use <owner/repo@skill>` pulls a skill without installing it**, for one-off use. That's the first option when the need is momentary.
- **The risk to name out loud before installing:** `npx` does not go through the `check_config_overwrite.js` hook, so a registry skill whose folder name matches one of your own overwrites it without warning. Installing into the project avoids this; installing with `-g` does not.
- **Meta-skills that teach the agent to install skills on its own stay off.** They contradict the control you keep over your own config, and the CLI commands work fine without them.
- **Calibrate your expectations of the catalog:** most entries are personal repos with no audit. The registry's own `/audits` page listed 50 skills, 12 audited by three providers and 38 pending, when this was written. Read a third-party `SKILL.md` before using it, same as any other code you did not write.

*(Holds while the vercel-labs/skills CLI installs by folder name, `find` prints results without a TTY, and `update` operates only on `~/.agents/.skill-lock.json`. Observed 2026-09-09.)*
