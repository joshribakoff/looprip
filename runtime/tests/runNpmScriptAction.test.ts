import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

const { runNpmScriptAction } = await import('../src/actions/runNpmScript.js');

describe('runNpmScriptAction', () => {
  afterEach(() => {
    spawnMock.mockReset();
  });

  it('runs allowed scripts with permitted flags', async () => {
    class FakeStream extends EventEmitter {
      setEncoding = vi.fn();
    }

    class FakeChild extends EventEmitter {
      stdout = new FakeStream();
      stderr = new FakeStream();
      kill = vi.fn();
    }

    spawnMock.mockImplementation(() => {
      const child = new FakeChild();
      queueMicrotask(() => {
        child.stdout.emit('data', 'ok');
        child.emit('close', 0, null);
      });
      return child;
    });

    const result = await runNpmScriptAction({ script: 'runtime:test', flags: { watch: true, filter: 'agent' } });

    expect(spawnMock).toHaveBeenCalledWith('npm', ['run', 'runtime:test', '--', '--watch', '--filter', 'agent'], expect.any(Object));
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
    expect(result.timedOut).toBe(false);
  });

  it('rejects disallowed flags', async () => {
    await expect(runNpmScriptAction({ script: 'runtime:build', flags: { watch: true } })).rejects.toThrow(/does not accept flags/);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
