# Learning Plan Skill — Robust Tracking & Adaptive Delivery

**Date:** 2026-04-10
**Author:** HawkBot 🦅
**Status:** Draft

---

## Context

The current Learning Plan skill has a fragile lesson tracking mechanism. It infers the lesson number from `days_elapsed_since_start + 1`, which breaks when:
- The cron job misses a scheduled run
- The system is restarted
- A weekday-only plan runs while still calculating days linearly

The result: Eduardo saw "Day 14/30" yesterday (2026-04-09), and then "Day 14/30" again today (2026-04-10) — as if the course was finishing, when in reality it was only at lesson 14 of 30.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State storage | Explicit `state.json` file | Precise, can handle gaps, self-healing |
| Duplicate protection | No explicit lock | Edge case risk is near-zero in OpenClaw cron |
| Catch-up | Manual (option B) | Eduardo chooses whether to replay missed lessons |
| Weekday support | Yes | Via `weekdaysOnly: true` in state + cron `1-5` |
| Missing/corrupt state | Treat as first delivery | Self-healing; creates fresh state on next run |

---

## State File Schema

**Path:** `{PLAN_DIR}/state.json`

```json
{
  "planSlug": "systems-design-ai-native",
  "displayName": "Systems Design for AI-Native Apps",
  "startDate": "2026-03-28",
  "weekdaysOnly": false,
  "deliveryTime": "16:00",
  "cronJobId": "abc-123",
  "lastDelivered": {
    "dayNumber": 14,
    "dayFile": "day-14.md",
    "deliveredAt": "2026-04-10"
  },
  "createdAt": "2026-03-27"
}
```

**Rules:**
- `lastDelivered` updated **only after** successful Telegram delivery
- If the file is missing → treat as first delivery (Day 1, no catch-up)
- If the file is corrupted → rename to `.backup`, treat as first delivery
- `weekdaysOnly: true` enables weekend skipping

---

## Core Algorithm

### Step 1 — Read state (with self-healing)

```
Read: {PLAN_DIR}/state.json
If NOT EXISTS → create fresh state: lastDelivered=null, weekdaysOnly=false
If CORRUPTED → rename to .backup, create fresh state
```

### Step 2 — Calculate today's lesson number

```typescript
function calculateTodayLesson(state: StateFile, today: Date): number | null {
  // Weekend skip for weekday-only plans
  if (state.weekdaysOnly && isWeekend(today)) return null;

  const elapsed = state.weekdaysOnly
    ? weekdaysBetween(state.startDate, today)   // count weekdays only
    : calendarDaysBetween(state.startDate, today); // count all days

  return elapsed + 1; // Day 1 = startDate
}

function weekdaysBetween(startDate: string, today: Date): number {
  let count = 0;
  const d = nextDay(previousDay(startDate));
  while (d < today) {
    if (!isWeekend(d)) count++;
    d = nextDay(d);
  }
  return count;
}
```

**Examples for `weekdaysOnly: true`:**

```
Start: 2026-03-27 (Fri, Day 1)
  Mon Mar 30 → 1 weekday elapsed → Day 2  ✅
  Tue Mar 31 → 2 weekdays elapsed → Day 3  ✅
  Sat Apr 4, Sun Apr 5 → skipped
  Mon Apr 6  → 3 weekdays elapsed → Day 4  ✅
```

### Step 3 — Should we deliver?

```typescript
function shouldDeliver(state: StateFile, todayLesson: number): boolean {
  if (state.lastDelivered === null) return todayLesson === 1;
  return todayLesson > state.lastDelivered.dayNumber;
}
```

- If `lastDelivered = Day 5` and today = Day 6 → deliver (progress normally)
- If `lastDelivered = Day 6` and today = Day 6 → skip (already delivered, duplicate cron fire)
- If `lastDelivered = Day 5` and today = Day 8 → gap detected → send today's lesson + flag catch-up

### Step 4 — Catch-up detection

```typescript
const gap = todayLesson - (state.lastDelivered?.dayNumber ?? 0);

if (gap > 1) {
  // Eduardo will be notified about missed lessons
  // A separate isolated cron job is created to replay missed lessons one-by-one
  // Eduardo chooses whether to proceed or skip
}
```

**The catch-up job payload:**
```
📚 Catch-up: {MISSED_COUNT} missed lessons found

The following lessons were not delivered:
- Day {MISSED_DAY}: {TITLE}

Do you want me to replay them? Reply YES to proceed lesson by lesson, or SKIP to ignore.
```

The catch-up job is delivered to the learning thread (topic 17) and waits for Eduardo's response before proceeding.

### Step 5 — Lesson delivery & state update

```
## Step 5 — Read lesson file
Path: {PLAN_DIR}/day-{NN}.md (zero-padded)
If MISSING → generate on-the-fly (fallback, same as current behavior)

## Step 6 — Send to Eduardo
Telegram to topic 17 (learning thread)
Open with: 🦅 *[Topic] — Day N/30*
Include full lesson text. No summarize, no truncate.

## Step 7 — Update state.json (atomically)
- Set lastDelivered.dayNumber = N
- Set lastDelivered.dayFile = "day-NN.md"
- Set lastDelivered.deliveredAt = {today ISO date}

## Step 8 — Completion check
If today's lesson == 30:
  1. Congratulations message → Telegram
  2. Delete state.json
  3. Delete cron job (jobId from state.cronJobId)
  4. STOP
```

---

## Skill Changes

### New plan creation flow

**Before (old):**
1. Create PLAN.md
2. Create cron job with embedded payload
3. Pre-generate lessons via Opus subagent
4. Done — no state tracking

**After (new):**
1. Create PLAN.md
2. **Create `state.json`** (immediately, before cron)
3. Create cron job with reference to state.json only
4. Pre-generate lessons via Opus subagent
5. Done — full state tracking active

The cron job payload is simplified to:
```
Read {PLAN_DIR}/state.json
Follow the algorithm in Steps 1-8 above.
```

No more hardcoded START_DATE or CRON_JOB_ID in the payload — those are read from state.json.

### Updating existing plans (migration)

For any existing plan with lessons but no state.json:
1. Read the existing lesson files to find the highest-numbered lesson
2. Create state.json with `lastDelivered` set to that lesson
3. Future runs use the state file from this point forward

---

## File Structure

```
workspace/
  learning-plans/
    {slug}/
      PLAN.md          ← already exists
      state.json       ← NEW: tracking state
      day-01.md        ← already exist
      ...
      day-30.md
      state.backup.json ← created only on corruption recovery
```

---

## Summary of Improvements

| Problem | Old behavior | New behavior |
|---|---|---|
| Tracking based on elapsed days | ❌ Breaks on missed crons | ✅ Explicit state.json |
| "Day 14" shown twice | ❌ Happened | ✅ lastDelivered prevents duplicate |
| Weekend skip | ❌ Cron only (missed days still calculated wrong) | ✅ Both cron AND algorithm skip weekends |
| State file missing | N/A | ✅ Self-healing: creates fresh state |
| Missed lessons | ❌ Lost | ✅ Catch-up notification to Eduardo |
| Completing at Day 30 | ❌ Worked | ✅ Same, but deletes state.json too |

---

## Next Steps

1. Write updated SKILL.md with new algorithm
2. Test on a new learning plan (not the existing one, which is complete)
3. Migrate any in-progress plans that exist

---

## Questions Resolved

- **Tracking:** Explicit state.json (Option A) ✅
- **Day calculation:** Adaptive based on startDate + elapsed days, respecting weekdaysOnly ✅
- **Duplicate protection:** No lock (Option B — simple) ✅
- **Catch-up:** Manual (Option B — Eduardo chooses) ✅
- **Weekday-only:** Both in cron expression AND algorithm ✅
