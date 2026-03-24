# Claude Code Agent Teams - Master Reference Guide

> Coordinate multiple Claude Code instances working together as a team, with shared tasks, inter-agent messaging, and centralized management.

## Table of Contents

1. [Enable Agent Teams](#enable-agent-teams)
2. [When to Use Agent Teams](#when-to-use-agent-teams)
3. [Agent Teams vs Subagents](#agent-teams-vs-subagents)
4. [Starting a Team](#starting-a-team)
5. [Controlling Your Team](#controlling-your-team)
6. [Architecture](#architecture)
7. [Best Practices](#best-practices)
8. [Use Case Examples](#use-case-examples)
9. [Troubleshooting](#troubleshooting)
10. [Limitations](#limitations)

---

## Enable Agent Teams

Agent teams are disabled by default. Enable them by adding to your `settings.json` or `.claude/settings.local.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Requirements:**
- Claude Code v2.1.32 or later
- Check version: `claude --version`

---

## When to Use Agent Teams

### Best Use Cases

| Use Case | Why It Works |
|----------|--------------|
| **Research and review** | Multiple teammates investigate different aspects simultaneously, share and challenge findings |
| **New modules or features** | Teammates each own a separate piece without stepping on each other |
| **Debugging with competing hypotheses** | Test different theories in parallel, converge faster |
| **Cross-layer coordination** | Frontend, backend, tests - each owned by different teammate |

### When NOT to Use

- Sequential tasks with dependencies
- Same-file edits (causes conflicts)
- Simple, routine tasks (token overhead not worth it)
- Work with many interdependencies

---

## Agent Teams vs Subagents

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| **Context** | Own context; results return to caller | Own context; fully independent |
| **Communication** | Report back to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work requiring discussion |
| **Token cost** | Lower (results summarized) | Higher (each is separate instance) |

**Rule of thumb:**
- Use **subagents** for quick, focused workers that report back
- Use **agent teams** when teammates need to share findings, challenge each other, coordinate on their own

---

## Starting a Team

### Basic Syntax

Just describe what you want in natural language:

```text
Create an agent team with 3 teammates:
- One focused on frontend components
- One on backend API
- One on testing
```

### Specifying Models

```text
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Example: Multi-perspective Research

```text
I'm designing a CLI tool that helps developers track TODO comments.
Create an agent team to explore this from different angles:
- One teammate on UX
- One on technical architecture
- One playing devil's advocate
```

---

## Controlling Your Team

### Display Modes

| Mode | Description | Setup |
|------|-------------|-------|
| **in-process** | All teammates in main terminal | Default, no setup |
| **split panes** | Each teammate gets own pane | Requires tmux or iTerm2 |

Configure in `settings.json`:
```json
{
  "teammateMode": "in-process"
}
```

Or via flag:
```bash
claude --teammate-mode in-process
```

### Navigation (In-Process Mode)

| Action | Shortcut |
|--------|----------|
| Cycle through teammates | `Shift+Down` |
| View teammate's session | `Enter` |
| Interrupt teammate | `Escape` |
| Toggle task list | `Ctrl+T` |

### Talk to Teammates Directly

Each teammate is a full, independent Claude Code session. You can:
- Give additional instructions
- Ask follow-up questions
- Redirect their approach

### Task Management

Tasks have three states: **pending**, **in progress**, **completed**

Two assignment modes:
1. **Lead assigns**: Tell the lead which task to give to which teammate
2. **Self-claim**: Teammates pick up next unassigned task automatically

### Require Plan Approval

For complex/risky tasks:

```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

Teammate plans → Lead reviews → Approve or reject with feedback

### Shutdown Commands

**Single teammate:**
```text
Ask the researcher teammate to shut down
```

**Clean up entire team:**
```text
Clean up the team
```

> **Warning:** Always use the lead to clean up. Teammates should not run cleanup.

---

## Architecture

### Components

| Component | Role |
|-----------|------|
| **Team lead** | Main session that creates team, spawns teammates, coordinates |
| **Teammates** | Separate Claude Code instances working on tasks |
| **Task list** | Shared work items that teammates claim and complete |
| **Mailbox** | Messaging system for inter-agent communication |

### File Locations

- **Team config**: `~/.claude/teams/{team-name}/config.json`
- **Task list**: `~/.claude/tasks/{team-name}/`

### Communication

- **Automatic message delivery**: Messages delivered automatically to recipients
- **Idle notifications**: Teammates notify lead when finished
- **Shared task list**: All agents see task status, claim available work

### Messaging Types

- **message**: Send to one specific teammate
- **broadcast**: Send to all teammates (use sparingly - costs scale)

### Permissions

Teammates inherit lead's permission settings at spawn time. After spawning, individual modes can be changed.

---

## Best Practices

### 1. Give Teammates Enough Context

Teammates don't inherit lead's conversation history. Include details in spawn prompt:

```text
Spawn a security reviewer teammate with the prompt:
"Review the authentication module at src/auth/ for security vulnerabilities.
Focus on token handling, session management, and input validation.
The app uses JWT tokens stored in httpOnly cookies.
Report any issues with severity ratings."
```

### 2. Choose Appropriate Team Size

| Team Size | Best For |
|-----------|----------|
| 3-5 teammates | Most workflows (recommended starting point) |
| 5-6 tasks per teammate | Keeps everyone productive |

**Rule:** Three focused teammates often outperform five scattered ones.

### 3. Size Tasks Appropriately

| Size | Problem |
|------|---------|
| Too small | Coordination overhead exceeds benefit |
| Too large | Too long without check-ins, risk of wasted effort |
| Just right | Self-contained units with clear deliverable |

### 4. Wait for Teammates

If lead starts implementing instead of waiting:
```text
Wait for your teammates to complete their tasks before proceeding
```

### 5. Avoid File Conflicts

Break work so each teammate owns different files. Two teammates editing the same file = overwrites.

### 6. Monitor and Steer

- Check in on progress regularly
- Redirect approaches that aren't working
- Synthesize findings as they come in

---

## Use Case Examples

### Parallel Code Review

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Competing Hypotheses Investigation

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses.
Have them talk to each other to try to disprove each other's theories,
like a scientific debate. Update the findings doc with whatever consensus emerges.
```

### Feature Implementation (This Project)

```text
Create an agent team for Keycap Studio:
- Teammate 1: Implement multi-image support (5 images at once)
- Teammate 2: Add keyboard rotation/zoom controls
- Teammate 3: Fix remaining legend positioning issues
Have them work in parallel and coordinate via shared task list.
```

---

## Troubleshooting

### Teammates Not Appearing

1. Press `Shift+Down` to cycle (may already be running)
2. Check if task was complex enough to warrant a team
3. Verify tmux is installed: `which tmux`
4. For iTerm2: verify `it2` CLI installed, Python API enabled

### Too Many Permission Prompts

Pre-approve common operations in permission settings before spawning teammates.

### Teammates Stopping on Errors

- Check output via `Shift+Down` or clicking pane
- Give additional instructions directly
- Spawn replacement teammate to continue

### Lead Shuts Down Early

Tell lead to keep going or wait for teammates:
```text
Wait for teammates to finish before proceeding
```

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Limitations

| Limitation | Details |
|------------|---------|
| No session resumption | `/resume` and `/rewind` don't restore in-process teammates |
| Task status lag | Teammates sometimes fail to mark tasks complete |
| Slow shutdown | Teammates finish current request before shutting down |
| One team per session | Clean up current team before starting new one |
| No nested teams | Teammates cannot spawn their own teams |
| Lead is fixed | Can't promote teammate to lead |
| Permissions at spawn | All teammates start with lead's permission mode |
| Split panes limited | Not supported in VS Code terminal, Windows Terminal, or Ghostty |

---

## Quick Reference Card

### Enable
```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

### Start Team
```text
Create an agent team with X teammates for [task description]
```

### Navigate
- `Shift+Down` - Cycle teammates
- `Ctrl+T` - Toggle task list
- `Escape` - Interrupt teammate

### Common Commands
```text
Spawn a [role] teammate with prompt: "[context]"
Ask the [name] teammate to shut down
Wait for your teammates to complete
Clean up the team
```

### Best Practices Summary
1. 3-5 teammates max
2. 5-6 tasks per teammate
3. Give full context in spawn prompt
4. Avoid same-file edits
5. Monitor and steer regularly

---

*Source: https://code.claude.com/docs/en/agent-teams*
*Last updated: 2026-03-24*
