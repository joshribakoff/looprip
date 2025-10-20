import React from 'react';
import { Box, Text } from 'ink';
import { JobInfo } from '../state/uiStore.js';

type Props = {
  header: React.ReactNode;
  jobs: JobInfo[];
  index: number;
};

export function JobListScreen({ header, jobs, index }: Props) {
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

  return (
    <Box flexDirection="column">
      {header}
      <Box marginTop={1}>
        <Text bold>Background Jobs</Text>
      </Box>
      {jobs.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>No jobs running or queued.</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {jobs.map((job, i) => {
            const createdDate = new Date(job.run.createdAt);
            const started = job.run.startedAt ? new Date(job.run.startedAt) : null;
            const completed = job.run.completedAt ? new Date(job.run.completedAt) : null;
            const statusText = job.run.status;
            const timeStr = completed
              ? completed.toLocaleTimeString()
              : started
                ? started.toLocaleTimeString()
                : createdDate.toLocaleTimeString();
            return (
              <Box key={job.run.id} flexDirection="column" marginBottom={i < jobs.length - 1 ? 1 : 0}>
                <Text color={i === index ? 'cyan' : undefined}>
                  {i === index ? '› ' : '  '}
                  <Text color={statusColor(job.run.status)}>
                    {statusSymbol(job.run.status)}
                  </Text>
                  {'  '}
                  <Text bold>{(job.run.pipelineName || 'Unnamed pipeline')}</Text>
                  {'  '}
                  <Text dimColor>status:</Text>{' '}
                  <Text color={statusColor(job.run.status)}>{statusText}</Text>
                  {'  '}
                  <Text dimColor>{completed ? 'ended:' : started ? 'started:' : 'created:'} {timeStr}</Text>
                </Text>
                {job.run.userPrompt && (
                  <Text dimColor>    {job.run.userPrompt.slice(0, 60)}{job.run.userPrompt.length > 60 ? '...' : ''}</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>↑/↓: navigate • Enter: view details • Esc: back</Text>
      </Box>
    </Box>
  );
}

export default JobListScreen;
