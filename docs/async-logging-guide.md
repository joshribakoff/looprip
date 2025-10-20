# Async Job Execution and Logging Features

## Overview

The pipeline runtime now supports asynchronous job execution with comprehensive logging capabilities. Jobs run in the background, allowing you to queue multiple pipelines and monitor their progress without blocking the TUI.

## Features

### 1. Background Job Execution

When you select a pipeline to run from the interactive TUI, it now:
- Creates a unique run ID
- Sets up a dedicated artifacts directory (`.pipeline-runs/<run-id>/`)
- Queues the job to run in the background
- Immediately returns you to the job list view

Multiple pipelines can run concurrently without interfering with each other.

### 2. Comprehensive Logging

Each run generates multiple log files in its artifacts directory:

#### `metadata.json`
Contains run metadata including:
- Run ID, pipeline path, and name
- User prompt (if provided)
- Status (queued, running, completed, failed, interrupted)
- Timestamps (created, started, completed) in UTC ISO 8601 format

#### `logs.jsonl`
Structured log entries in JSON Lines format with:
- UTC timestamps
- Log levels (debug, info, warn, error)
- Categories (pipeline, node, agent, tool, system)
- Message and additional data fields

Example entry:
```json
{"timestamp":"2025-10-19T23:15:00.123Z","level":"info","category":"pipeline","message":"Starting pipeline: simple-task-test","data":{"description":"Test basic task execution"}}
```

#### `logs.txt`
Plain text logs for easy viewing in editors:
```
[2025-10-19T23:15:00.123Z] [INFO] [pipeline] Starting pipeline: simple-task-test {"description":"Test basic task execution"}
```

#### `tool-calls.jsonl`
Dedicated log of agent tool calls with inputs and outputs.

### 3. Job Management UI

#### Main Menu
- New "View jobs" option to access the job management interface

#### Job List Screen
- Shows all jobs (past and present) sorted by creation time
- Status indicators: ⟳ running, ✔ completed, ✖ failed, ⊘ interrupted, ○ queued
- Color-coded status: yellow (running), green (completed), red (failed), magenta (interrupted)
- Navigation: ↑/↓ to select, Enter to view details, Esc to return to main menu

#### Job Detail Screen
- Full job metadata (name, status, timestamps, user prompt)
- Log file paths (clickable in some terminals with Cmd+Click)
- Live log display with auto-scrolling
- Actions:
  - `f`: Toggle auto-follow (automatically scroll to bottom as new logs arrive)
  - `r`: Resume interrupted/failed jobs from saved state
  - `n`: Start a fresh run with the same pipeline and prompt
  - ↑/↓: Scroll through logs manually
  - Esc: Return to job list

### 4. Run Resumption

Jobs that fail or are interrupted can be resumed:
- Press `r` in the job detail view to resume from the saved state
- Press `n` to start a completely fresh run with the same parameters
- Only available for failed or interrupted jobs

### 5. Persistent State

All job state is persisted to disk in `.pipeline-runs/`:
- Survives TUI restarts
- Jobs continue running even if you exit and reopen the TUI
- Historical job data is retained for review

## Usage

### Starting a Pipeline

1. Launch interactive mode: `p` or `npm run interactive`
2. Select "Run a pipeline" or "Run a prompt"
3. Choose your pipeline
4. If needed, enter a prompt
5. The job is queued and begins running in the background
6. You're taken to the job list to monitor progress

### Monitoring Jobs

1. From main menu, select "View jobs"
2. Use ↑/↓ to navigate the job list
3. Press Enter to view detailed logs and status
4. Press `f` to enable auto-follow for running jobs
5. View log file paths to open them externally

### Reviewing Logs

Logs are stored in `.pipeline-runs/<run-id>/`:

```bash
# View plain text logs
cat .pipeline-runs/<run-id>/logs.txt

# View structured logs
cat .pipeline-runs/<run-id>/logs.jsonl | jq

# View tool calls
cat .pipeline-runs/<run-id>/tool-calls.jsonl | jq

# View metadata
cat .pipeline-runs/<run-id>/metadata.json | jq
```

### Resuming Failed Jobs

1. Navigate to the job in the job list
2. Press Enter to view details
3. If the job failed or was interrupted, press `r` to resume
4. Or press `n` to start fresh with the same configuration

## Directory Structure

```
.pipeline-runs/
├── <run-id-1>/
│   ├── metadata.json
│   ├── logs.jsonl
│   ├── logs.txt
│   └── tool-calls.jsonl
├── <run-id-2>/
│   ├── metadata.json
│   ├── logs.jsonl
│   ├── logs.txt
│   └── tool-calls.jsonl
└── ...
```

## Technical Details

### Timestamps

All timestamps use UTC timezone in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

Example: `2025-10-19T23:15:30.456Z`

### Run States

- `queued`: Job created but not yet started
- `running`: Job currently executing
- `completed`: Job finished successfully
- `failed`: Job encountered an error
- `interrupted`: Job was stopped before completion

### Log Polling

The TUI polls job logs every second to update the display in real-time. This ensures you see live progress without overwhelming the file system with writes.

### Concurrency

Multiple jobs can run simultaneously. There are no priority queues or concurrency limits in the current implementation - all queued jobs start immediately in the background.
