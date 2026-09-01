# Adaptive AI Interview Platform Checklist

Status legend:
- `[ ]` not started
- `[-]` in progress
- `[x]` completed

## Foundation

- [-] Audit the current quickstart and map existing code to the requested flowchart
- [-] Create a point-wise implementation tracker and keep it updated
- [ ] Make interview/session/report storage durable across restarts
- [ ] Make the app deployable as a single Next.js project with documented env requirements

## Authentication

- [ ] Add signup flow
- [ ] Add login flow
- [ ] Add logout flow
- [ ] Add authenticated session lookup
- [ ] Protect dashboard and report pages behind auth

## Interview Engine

- [ ] Start each interview at easy difficulty
- [ ] Ask a fixed target number of questions per interview
- [ ] Increase difficulty when the candidate performs well
- [ ] Decrease difficulty when the candidate struggles
- [ ] Track strengths, weaknesses, uncertainty, trends, and evidence
- [ ] Generate recommendation-focused final reports for shortcomings

## Product Features

- [ ] Save every finished interview attempt to persistent storage
- [ ] Show the final report in the UI after the conversation ends
- [ ] Build a candidate dashboard with history and summary metrics
- [ ] Build a leaderboard that compares scores across candidates
- [ ] Save leaderboard entries from finished interview reports

## Verification and Docs

- [ ] Update the README for the full interview platform flow
- [ ] Update `AGENTS.md` and `docs/ai/` to match the new architecture
- [ ] Run lint
- [ ] Run typecheck
- [ ] Run API verification
- [ ] Run build
