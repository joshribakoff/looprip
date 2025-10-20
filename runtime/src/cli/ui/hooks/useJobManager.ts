/**
 * Hook for managing background job execution and monitoring
 */

import { useEffect, useRef } from 'react';
import { useUiDispatch, useUiState, actions } from '../state/uiStore.js';
import { RunManager } from '../../../utils/runManager.js';
import { RunLogger } from '../../../utils/runLogger.js';
import { PipelineExecutor } from '../../../executors/index.js';
import { PipelineParser } from '../../../core/parser.js';
import { Pipeline } from '../../../types/index.js';
import { executePromptWithLogger } from '../../../prompt/runner.js';

export function useJobManager() {
  const dispatch = useUiDispatch();
  const state = useUiState();
  const runManagerRef = useRef(new RunManager());
  const activeJobsRef = useRef<Set<string>>(new Set());

  // Load existing jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      const runs = await runManagerRef.current.listRuns();
      dispatch(actions.jobsLoaded(runs));
    };
    void loadJobs();
  }, [dispatch]);

  // Poll for log updates on running jobs
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const job of state.jobs) {
        if (job.run.status === 'running' || job.run.status === 'queued') {
          try {
            // Reload metadata
            const metadata = await runManagerRef.current.loadMetadata(job.run.id);
            
              // Read new log lines
              const plainLogs = await runManagerRef.current.readPlainLogs(job.run.id);
              const allLines = plainLogs.split('\n').filter(line => line.trim());
              const startIndex = Math.min(job.logLines.length, allLines.length);
              const newLines = allLines.slice(startIndex);
              if (newLines.length > 0 || metadata.status !== job.run.status) {
                dispatch(actions.jobUpdated(job.run.id, metadata, newLines));
              }
          } catch {
            // Ignore errors reading logs
          }
        }
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [state.jobs, dispatch]);

  const queueJob = async (
    pipelinePath: string,
    pipelineName: string,
    userPrompt?: string
  ): Promise<string> => {
    const run = await runManagerRef.current.createRun(pipelinePath, pipelineName, userPrompt);
    dispatch(actions.jobQueued(run));
    
    // Start execution in background
    void executeJob(run.id, pipelinePath, userPrompt);
    
    return run.id;
  };

  const queuePrompt = async (
    promptPath: string,
    promptName: string
  ): Promise<string> => {
    // Reuse run metadata structure; store promptPath in pipelinePath field
    const run = await runManagerRef.current.createRun(promptPath, promptName, undefined);
    dispatch(actions.jobQueued(run));

    // Start execution in background
    void executePromptJob(run.id, promptPath);

    return run.id;
  };

  const executeJob = async (
    runId: string,
    pipelinePath: string,
    userPrompt?: string
  ): Promise<void> => {
    if (activeJobsRef.current.has(runId)) {
      return; // Already running
    }

    activeJobsRef.current.add(runId);

    // Create logger for this run
    const logger = new RunLogger(runId, runManagerRef.current, false);

    try {
      // Update status to running
      await runManagerRef.current.updateRunStatus(runId, 'running');
      dispatch(actions.jobStarted(runId));

      // Parse pipeline
      const parser = new PipelineParser();
      const pipeline: Pipeline = await parser.loadFromFile(pipelinePath);

      // Execute pipeline
      const executor = new PipelineExecutor(process.env.ANTHROPIC_API_KEY, logger);
      const result = await executor.execute(pipeline, {
        workingDirectory: state.cwd,
        environment: {},
        userPrompt,
        verbose: false,
      });

      // Update status
      if (result.success) {
        await runManagerRef.current.updateRunStatus(runId, 'completed');
        dispatch(actions.jobCompleted(runId, true));
      } else {
        const msg = 'Pipeline execution failed';
        logger.error(msg);
        await runManagerRef.current.updateRunStatus(runId, 'failed', msg);
        dispatch(actions.jobFailed(runId, msg));
      }
      
      // Flush logger to ensure all logs are written
      await logger.flush();
    } catch (error: any) {
      const message = error?.message || String(error);
      logger.error('Pipeline job failed', message);
      await runManagerRef.current.updateRunStatus(runId, 'failed', message);
      dispatch(actions.jobFailed(runId, message));
      await logger.flush();
    } finally {
      activeJobsRef.current.delete(runId);
    }
  };

  const executePromptJob = async (
    runId: string,
    promptPath: string,
  ): Promise<void> => {
    if (activeJobsRef.current.has(runId)) {
      return; // Already running
    }

    activeJobsRef.current.add(runId);

    const logger = new RunLogger(runId, runManagerRef.current, false);

    try {
      await runManagerRef.current.updateRunStatus(runId, 'running');
      dispatch(actions.jobStarted(runId));

      const result = await executePromptWithLogger(promptPath, logger);

      if (result.success) {
        await runManagerRef.current.updateRunStatus(runId, 'completed');
        dispatch(actions.jobCompleted(runId, true));
      } else {
        await runManagerRef.current.updateRunStatus(runId, 'failed', 'Prompt execution failed');
        dispatch(actions.jobFailed(runId, 'Prompt execution failed'));
      }

      await logger.flush();
    } catch (error: any) {
      const message = error?.message || String(error);
      logger.error('Prompt job failed', message);
      await runManagerRef.current.updateRunStatus(runId, 'failed', message);
      dispatch(actions.jobFailed(runId, message));
      await logger.flush();
    } finally {
      activeJobsRef.current.delete(runId);
    }
  };

  const resumeJob = async (runId: string): Promise<void> => {
    const canResume = await runManagerRef.current.canResume(runId);
    if (!canResume) {
      throw new Error('Job cannot be resumed');
    }

    const metadata = await runManagerRef.current.loadMetadata(runId);
    await executeJob(runId, metadata.pipelinePath, metadata.userPrompt);
  };

  const getLogPaths = (runId: string) => {
    return {
      structured: runManagerRef.current.getStructuredLogsPath(runId),
      plain: runManagerRef.current.getPlainLogsPath(runId),
      toolCalls: runManagerRef.current.getToolCallsPath(runId),
    };
  };

  return {
    queueJob,
    queuePrompt,
    resumeJob,
    getLogPaths,
  };
}
