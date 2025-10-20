import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInkLogger, LogEntry } from '../logger/InkLogger.js';

type Props = {
  scrollOffset: number;
  windowHeight?: number;
};

function renderLogEntry(item: LogEntry) {
  switch (item.level) {
    case 'error':
      return (
        <Text key={item.id} color="red">
          {item.message}
        </Text>
      );
    case 'warn':
      return (
        <Text key={item.id} color="yellow">
          {item.message}
        </Text>
      );
    case 'stdout':
      return <Text key={item.id}>{item.message}</Text>;
    case 'stderr':
      return (
        <Text key={item.id} color="redBright">
          {item.message}
        </Text>
      );
    case 'pipeline':
      return (
        <Text key={item.id} color="magentaBright">
          {item.message}
        </Text>
      );
    case 'node':
      return (
        <Text key={item.id} color="blueBright">
          {item.message}
        </Text>
      );
    case 'task':
      return (
        <Text key={item.id} color="cyan">
          {item.message}
        </Text>
      );
    case 'agent':
      return (
        <Text key={item.id} color="greenBright">
          {item.message}
        </Text>
      );
    case 'validation':
      return (
        <Text key={item.id} color="gray">
          {item.message}
        </Text>
      );
    case 'section':
      return (
        <Text key={item.id} color="cyanBright">
          {item.message}
        </Text>
      );
    default:
      return <Text key={item.id}>{item.message}</Text>;
  }
}

export function ScrollableLogView({ scrollOffset, windowHeight = 10 }: Props) {
  const { entries } = useInkLogger();

  // Calculate which entries to display
  const { visibleEntries, canScrollUp, canScrollDown, currentLine, totalLines } = useMemo(() => {
    // Count total lines (entries can have multiple lines)
    const lineEntries: Array<{ entry: LogEntry; lineIndex: number }> = [];
    entries.forEach((entry) => {
      const lines = entry.message.split('\n');
      lines.forEach((_, lineIndex) => {
        lineEntries.push({ entry, lineIndex });
      });
    });

    const totalLines = lineEntries.length;
    const startLine = Math.max(0, Math.min(scrollOffset, totalLines - windowHeight));
    const endLine = Math.min(startLine + windowHeight, totalLines);

    const visible = lineEntries.slice(startLine, endLine);

    return {
      visibleEntries: visible,
      canScrollUp: startLine > 0,
      canScrollDown: endLine < totalLines,
      currentLine: startLine + 1,
      totalLines,
    };
  }, [entries, scrollOffset, windowHeight]);

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>No output yet...</Text>
      </Box>
    );
  }

  // Group consecutive lines from same entry to render together
  const groupedForRendering: Array<{ entry: LogEntry; lines: string[] }> = [];
  let currentGroup: { entry: LogEntry; lines: string[] } | null = null;

  visibleEntries.forEach(({ entry, lineIndex }) => {
    const allLines = entry.message.split('\n');
    const line = allLines[lineIndex];

    if (!currentGroup || currentGroup.entry.id !== entry.id) {
      if (currentGroup) {
        groupedForRendering.push(currentGroup);
      }
      currentGroup = { entry, lines: [line] };
    } else {
      currentGroup.lines.push(line);
    }
  });
  if (currentGroup) {
    groupedForRendering.push(currentGroup);
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {groupedForRendering.map((group, idx) => {
          const reconstructedEntry = {
            ...group.entry,
            message: group.lines.join('\n'),
          };
          return <Box key={`${group.entry.id}-${idx}`}>{renderLogEntry(reconstructedEntry)}</Box>;
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {canScrollUp && '↑ '}
          Line {currentLine}-{Math.min(currentLine + windowHeight - 1, totalLines)} of {totalLines}
          {canScrollDown && ' ↓'}
        </Text>
        <Text dimColor> • ↑/↓: scroll</Text>
      </Box>
    </Box>
  );
}

export default ScrollableLogView;
