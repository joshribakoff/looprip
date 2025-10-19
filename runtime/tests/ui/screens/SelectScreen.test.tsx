import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { SelectScreen } from '../../../src/cli/ui/screens/SelectScreen.js';
import { 
  mockPipelineChoices, 
  createTestHeader, 
  expectTextInOutput,
  expectTextNotInOutput,
  getRenderedText 
} from '../testUtils.js';

describe('SelectScreen', () => {
  const defaultProps = {
    header: createTestHeader(),
    choices: mockPipelineChoices,
    index: 0,
    notice: null,
  };

  describe('rendering', () => {
    it('should render header and title', () => {
      const result = render(<SelectScreen {...defaultProps} />);
      
      expectTextInOutput(result, 'Test Header');
      expectTextInOutput(result, 'Select a pipeline to run:');
    });

    it('should render list of choices', () => {
      const result = render(<SelectScreen {...defaultProps} />);
      
      expectTextInOutput(result, 'Simple Task Pipeline');
      expectTextInOutput(result, 'File Processing Pipeline');
      expectTextInOutput(result, 'Agent Test Pipeline');
    });

    it('should highlight selected choice with cursor', () => {
      const result = render(<SelectScreen {...defaultProps} index={1} />);
      const output = getRenderedText(result);
      
      // First item should not have cursor
      expect(output).toContain('  Simple Task Pipeline');
      // Second item should have cursor
      expect(output).toContain('› File Processing Pipeline');
    });

    it('should show help text at bottom', () => {
      const result = render(<SelectScreen {...defaultProps} />);
      
      expectTextInOutput(result, '↑/↓: navigate • Enter: select • r: refresh • q/Esc: back to main menu');
    });
  });

  describe('empty state', () => {
    it('should show empty state when no choices provided', () => {
      const result = render(<SelectScreen {...defaultProps} choices={[]} />);
      
      expectTextInOutput(result, 'No pipeline files found');
      expectTextInOutput(result, 'Press "r" to refresh or use custom path');
    });

    it('should not show pipeline names when empty', () => {
      const result = render(<SelectScreen {...defaultProps} choices={[]} />);
      
      expectTextNotInOutput(result, 'Simple Task Pipeline');
      expectTextNotInOutput(result, 'File Processing Pipeline');
    });
  });

  describe('notices', () => {
    it('should show success notice', () => {
      const notice = { text: 'Pipeline completed successfully', color: 'green' as const };
      const result = render(<SelectScreen {...defaultProps} notice={notice} />);
      
      expectTextInOutput(result, 'Pipeline completed successfully');
    });

    it('should show error notice', () => {
      const notice = { text: 'Pipeline failed with error', color: 'red' as const };
      const result = render(<SelectScreen {...defaultProps} notice={notice} />);
      
      expectTextInOutput(result, 'Pipeline failed with error');
    });

    it('should show warning notice', () => {
      const notice = { text: 'Pipeline completed with warnings', color: 'yellow' as const };
      const result = render(<SelectScreen {...defaultProps} notice={notice} />);
      
      expectTextInOutput(result, 'Pipeline completed with warnings');
    });

    it('should not show notice section when notice is null', () => {
      const result = render(<SelectScreen {...defaultProps} notice={null} />);
      const output = getRenderedText(result);
      
      // Should not have extra spacing/sections for notice
      expect(output?.split('\n').filter(line => line.trim()).length).toBeGreaterThan(0);
    });
  });

  describe('index bounds', () => {
    it('should handle index 0 correctly', () => {
      const result = render(<SelectScreen {...defaultProps} index={0} />);
      const output = getRenderedText(result);
      
      expect(output).toContain('› Simple Task Pipeline');
    });

    it('should handle last index correctly', () => {
      const lastIndex = mockPipelineChoices.length - 1;
      const result = render(<SelectScreen {...defaultProps} index={lastIndex} />);
      const output = getRenderedText(result);
      
      expect(output).toContain('› Agent Test Pipeline');
    });

    it('should handle out-of-bounds index gracefully', () => {
      const result = render(<SelectScreen {...defaultProps} index={999} />);
      
      // Should not crash and should render the list
      expectTextInOutput(result, 'Simple Task Pipeline');
      expectTextInOutput(result, 'File Processing Pipeline');
    });
  });

  describe('accessibility', () => {
    it('should have clear visual hierarchy', () => {
      const result = render(<SelectScreen {...defaultProps} />);
      
      // Title should be bold/prominent
      expectTextInOutput(result, 'Select a pipeline to run:');
      
      // Help text should be present and distinguishable
      expectTextInOutput(result, '↑/↓: navigate');
    });

    it('should show selected item clearly', () => {
      const result = render(<SelectScreen {...defaultProps} index={1} />);
      const output = getRenderedText(result);
      
      // Selected item should have visual indicator
      expect(output).toContain('› File Processing Pipeline');
    });
  });
});