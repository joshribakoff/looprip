import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { JobInfo } from '../state/uiStore.js';

type Props = {
  header: React.ReactNode;
  job: JobInfo;
  scrollOffset: number;
  logFilePaths: { structured: string; plain: string; toolCalls: string };
  onResume?: () => void;
  onStartFresh?: () => void;
};

export function JobDetailScreen({ header, job, scrollOffset, logFilePaths, onResume, onStartFresh }: Props) {
  const autoFollowRef = useRef(job.autoFollow);
  
  useEffect(() => {
    autoFollowRef.current = job.autoFollow;
  }, [job.autoFollow]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'running': return 'yellow';
      case 'failed': return 'red';
      case 'interrupted': return 'magenta';
      default: return 'gray';
    }
  };

  const statusSymbol = (status: string) => {
    switch (status) {
      case 'completed': return '✔';
      case 'running': return '⟳';
      case 'failed': return '✖';
      case 'interrupted': return '⊘';
      default: return '○';
    }
  };

  const canResume = job.run.status === 'failed' || job.run.status === 'interrupted';

  const displayLines = job.logLines.length > 0 
    ? job.logLines.slice(scrollOffset, scrollOffset + 20) 
    : ['No logs yet...'];

  const createdDate = new Date(job.run.createdAt);
  const startedDate = job.run.startedAt ? new Date(job.run.startedAt) : null;
  const completedDate = job.run.completedAt ? new Date(job.run.completedAt) : null;

  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold>Job: </Text>
          <Text>{job.run.pipelineName || 'Unnamed pipeline'}</Text>
          <Text> </Text>
          <Text color={statusColor(job.run.status)}>
            {statusSymbol(job.run.status)} {job.run.status}
          </Text>
        </Box>
        {job.run.userPrompt && (
          <Box marginTop={1}>
            <Text bold>Prompt: </Text>
            <Text>{job.run.userPrompt}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>Created: {createdDate.toLocaleString()}</Text>
        </Box>
        {startedDate && (
          <Box>
            <Text dimColor>Started: {startedDate.toLocaleString()}</Text>
          </Box>
        )}
        {completedDate && (
          <Box>
            <Text dimColor>Completed: {completedDate.toLocaleString()}</Text>
          </Box>
        )}
        {job.run.error && (
          <Box marginTop={1}>
            <Text color="red">Error: {job.run.error}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Log Files:</Text>
        <Text dimColor>Plain text: {logFilePaths.plain}</Text>
        <Text dimColor>Structured: {logFilePaths.structured}</Text>
        <Text dimColor>Tool calls: {logFilePaths.toolCalls}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text bold>Live Logs </Text>
          {job.autoFollow && <Text color="green">(auto-following)</Text>}
        </Box>
        <Box marginTop={1} flexDirection="column">
          {displayLines.map((line, i) => (
            <Text key={i} dimColor={!line}>
              {line || ' '}
            </Text>
          ))}
        </Box>
        {job.logLines.length > displayLines.length && (
          <Box marginTop={1}>
            <Text dimColor>
              Showing {scrollOffset + 1}-{Math.min(scrollOffset + 20, job.logLines.length)} of {job.logLines.length} lines
            </Text>
          </Box>
        )}
      </Box>

      {canResume && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">Actions:</Text>
          <Text dimColor>r: Resume from saved state</Text>
          <Text dimColor>n: Start fresh (new run)</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {job.run.status === 'running' 
            ? '↑/↓: scroll • f: toggle auto-follow • Esc: back' 
            : canResume 
            ? '↑/↓: scroll • r: resume • n: new run • Esc: back'
            : '↑/↓: scroll • Esc: back'}
        </Text>
      </Box>
    </Box>
  );
}

export default JobDetailScreen;
