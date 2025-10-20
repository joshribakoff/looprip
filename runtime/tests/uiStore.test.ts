import { describe, it, expect } from 'vitest';
import { reducer, createInitialState, actions, type UIState, type UIAction } from '../src/cli/ui/state/uiStore.js';

type AnyAction = UIAction;
function reduce(state: UIState, act: AnyAction) {
  return reducer(state, act);
}

describe('uiStore reducer', () => {
  it('navigates between modes', () => {
    const init = createInitialState({ cwd: '/tmp' });
    const s1 = reduce(init, actions.navigateToSelectPipeline());
    expect(s1.mode).toBe('select');
    const s2 = reduce(s1, actions.navigateToCreatePrompt());
    expect(s2.mode).toBe('create-prompt');
    const s3 = reduce(s2, actions.navigateToMainMenu());
    expect(s3.mode).toBe('main-menu');
  });

  it('handles pipeline lifecycle to summary success', () => {
    const init = createInitialState({ cwd: '/tmp' });
    const s1 = reduce(init, actions.pipelineLoadingStarted('/a/b/pipeline.yaml'));
    expect(s1.mode).toBe('running');
    expect(s1.status).toBe('loading');
    const s2 = reduce(s1, actions.pipelineExecutionStarted());
    expect(s2.mode).toBe('running');
    const s3 = reduce(s2, actions.pipelineCompleted(true, 'ok'));
    expect(s3.mode).toBe('summary');
    expect(s3.status).toBe('success');
    expect(s3.lastResultSuccess).toBe(true);
  });

  it('enters prompt when required and stores pending path', () => {
    const init = createInitialState({ cwd: '/tmp' });
    const s1 = reduce(init, actions.navigateToEnterPrompt('/x/p.yaml'));
    expect(s1.mode).toBe('enter-prompt');
    expect(s1.pendingPipelinePath).toBe('/x/p.yaml');
  });

  it('handles prompt created notice and resets to main menu', () => {
    const init = createInitialState({ cwd: '/tmp' });
    const s1 = reduce(init, actions.promptCreated('/abs/prompt.md', 'prompts/prompt.md'));
    expect(s1.mode).toBe('main-menu');
    expect(s1.notice?.text).toContain('Prompt created');
  });
});
