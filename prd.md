# PRD: Shared Quest Board for Internal Teams

> **Prepared for implementation with Claude Code** · Version 0.1

## Overview

| Field | Detail |
|---|---|
| **Product** | An internal productivity tool where a shared backlog acts like a quest board. Team members claim tasks, mirror them to personal boards, and earn points for completion. |
| **Primary value** | Prevents overlap, improves ownership, and creates a lightweight game layer that keeps work moving. |
| **Target users** | Small internal teams, ops groups, agency teams, student teams, and volunteer teams. |
| **MVP outcome** | A team can publish tasks, claim work once, sync it to personal boards, complete it, and see points/leaderboards. |

---

## 1. Problem Statement

Current project tools usually assume a manager assigns work. This product inverts that: a shared pool of tasks where people self-select work, claim it once, avoid duplicate effort, and get light gamified rewards. The product must feel like a productivity tool first, not a game.

---

## 2. Product Vision

A simple internal system combining a Trello-like board, explicit task ownership, and a points system. The global backlog is the source of truth; when a person claims a task, it becomes theirs everywhere — including their personal board. The result should feel like a shared quest board with clear accountability.

---

## 3. Goals

- Reduce task overlap and duplicate work
- Make ownership visible and unambiguous
- Let people pull work from a shared backlog instead of waiting to be assigned
- Keep the interface simple enough for internal adoption with little training
- Use points, levels, or badges to create momentum without turning the tool into a game-only product

---

## 4. Non-Goals (v1)

- Replacing a full enterprise PM suite
- Complex sprint planning, Gantt charts, or deep dependency management
- Time tracking or payroll
- Public social networking features
- Heavy AI automation beyond basic task suggestions (later phase)

---

## 5. Product Principles

1. One task has one owner at a time
2. The shared board is the source of truth
3. Mirrors must stay in sync with the original task
4. Gamification should support behaviour, not distract from work
5. Make the fast path obvious: **create → claim → work → complete**

---

## 6. Users and Personas

| Persona | Description |
|---|---|
| **Contributor** | Sees available work, claims it quickly, and manages their own queue |
| **Coordinator** | Posts work into the backlog, ensures tasks are well-scoped, monitors progress |
| **Admin** | Manages team settings, scoring rules, permissions, and moderation |

---

## 7. Core User Flow

```
Coordinator creates task
  └─ title, description, points, difficulty, tags

Contributor browses open tasks
  └─ claims one

Task locks to that contributor
  └─ mirrors onto their personal board automatically

Contributor moves task through statuses
  └─ In Progress → Blocked → Review → Done

On completion
  └─ points awarded
  └─ leaderboard updated
```

---

## 8. Functional Requirements

| Requirement | Description |
|---|---|
| **Shared backlog** | Display all unclaimed tasks in one board or queue |
| **Claiming** | Allow exactly one active owner per task at a time |
| **Personal board** | Each user sees their claimed tasks in a private or semi-private board view |
| **Mirroring** | Changes to the original task appear on mirrored copies instantly |
| **Statuses** | Open → Claimed → In Progress → Blocked → Review → Done → Archived |
| **Scoring** | Points based on difficulty, with optional multipliers for urgency or impact |
| **Leaderboard** | Points by user; optionally by team or sprint |
| **Notifications** | Notify team when a task is claimed, unclaimed, blocked, or completed |
| **Admin controls** | Edit scoring rules, release stale claims, override ownership |

---

## 9. Task Object Design

### Required fields

```
id, title, description, status, owner_id, created_by,
points, difficulty, tags, due_date, blocked_reason,
created_at, updated_at
```

### Recommended optional fields

```
impact, urgency, estimate_minutes, attachments,
checklist, team_id, parent_task_id, mirror_ids
```

---

## 10. Ownership and Anti-Overlap Rules

- A task may have only one active owner
- **Claiming must be atomic** — two people cannot claim simultaneously
- If already claimed, others can only view, not duplicate
- Claims can expire after a configurable inactivity period
- Admins can release or reassign any task

---

## 11. Gamification Rules

- Base points come from task difficulty
- Optional multipliers for urgency, impact, or rapid turnaround
- **Do not reward task hoarding** — points earned on completion only
- Badges and streaks are post-MVP, after core workflow is validated

---

## 12. Permissions

| Role | Can do | Cannot do |
|---|---|---|
| **Contributor** | Claim tasks, update status, complete tasks | Change scoring rules or override others |
| **Coordinator** | Create/edit tasks, review claims, move tasks | Delete audit history |
| **Admin** | Manage users, roles, scoring, claim overrides | Nothing by default |

---

## 13. MVP Scope

- [ ] Authentication and team workspace setup
- [ ] Global backlog board with create / edit / delete
- [ ] Claim and release workflow
- [ ] Personal board mirrored from the shared board
- [ ] Task status changes and completion
- [ ] Points and leaderboard
- [ ] Basic notifications and audit log

---

## 14. Future Enhancements

- Task suggestions based on user skill or past work
- Skill trees and reputation
- Bounties or bidding for hard tasks
- Recurring tasks and auto-generated daily quests
- Team-level analytics for throughput and bottlenecks

---

## 15. Success Metrics

| Metric | What success looks like |
|---|---|
| **Claim rate** | Most new tasks are claimed within a reasonable time |
| **Overlap rate** | Duplicate effort drops to near zero |
| **Completion time** | Tasks move from open to done faster than the old process |
| **Adoption** | Most active team members use the tool weekly |
| **Satisfaction** | Users say the system is easy to understand and motivating |

---

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| People farm easy tasks | Use difficulty weighting and optional admin review of point values |
| Tasks stay claimed but idle | Add stale-claim reminders and admin release controls |
| Gamification feels childish | Keep the UI clean and the scoring subtle |
| Mirrors get out of sync | Treat the original task as source of truth; mirror state automatically |

---

## 17. Technical Notes for Claude Code

> These notes are written directly for Claude Code to act on when building this product.

- **Build CRUD first** — do not over-abstract the domain early
- **Atomic claim logic** — implement claiming at the database level so ownership is never ambiguous (use a transaction or `SELECT FOR UPDATE`)
- **Mirroring** — keep it event-driven or derive mirror state from the source record; do not duplicate data
- **Stack preference** — prefer a small, explicit stack that Claude Code can safely edit across a compact codebase
- **Test coverage priorities:**
  - Claim race conditions
  - Permission boundary checks
  - Point calculation correctness

---

## 18. Research and References

| Source | Why it matters | URL |
|---|---|---|
| Claude Code overview | Confirms the product is agentic, file-editing, command-running, and multi-surface | code.claude.com/docs/en/overview |
| Claude Code costs | Confirms token-based usage and team spend limits | code.claude.com/docs/en/costs |
| Trello card mirroring | Supports the mirrored personal-board pattern | support.atlassian.com/trello/docs/mirroring-cards/ |
| Linear — assigning issues | Supports single-owner clarity | linear.app/docs/assigning-issues |
| Linear — method/principles | Supports named ownership for delivery | linear.app/method/introduction |

---

*End of document*