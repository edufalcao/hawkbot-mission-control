#!/bin/bash
# Ralph loop — run this script to execute one task from the PRD checklist.
# The agent reads the PRD, picks the next unchecked item, implements it, commits, and updates progress.txt.

claude --model claude-opus-4-6 --dangerously-skip-permissions "@docs/PRD.md @progress.txt \
1. Read the PRD Implementation Checklist and the progress file. \
2. Find the next unchecked item [ ] (in order, starting from P0-1). \
3. Implement it completely — edit all files mentioned in the checklist item. \
4. Mark the checklist item as done in docs/PRD.md (change [ ] to [x]). \
5. Commit your changes with a descriptive message referencing the checklist item ID (e.g. feat: P0-1 remove hardcoded assignee enum). \
6. Update progress.txt marking the item as done and noting what you did. \
ONLY DO ONE CHECKLIST ITEM PER RUN."
