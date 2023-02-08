import { test, expect, vi, describe } from 'vitest';
import { interpret } from 'xstate';
import { z } from 'zod';
import { createLocalStorageMachine } from './local-storage-machine';

describe(createLocalStorageMachine.name, async () => {
  const StorageMock = {
    setItem: vi.fn(),
    getItem: vi.fn().mockImplementation((key: string) => {
      if (key === 'some string') {
        return 'foo';
      }

      if (key === 'some object') {
        return '{"foo":"bar"}';
      }

      return null;
    }),
    removeItem: vi.fn(),
  };

  vi.stubGlobal('localStorage', StorageMock);

  test('Retrieves a string', () => {
    const stringStorageService = interpret(
      createLocalStorageMachine({
        key: 'some string',
        deserialize: z.string(),
        serialize: (x) => x,
      })
    );
    stringStorageService.start();

    const value = stringStorageService.getSnapshot().context.value;
    //    ^?

    expect(value).toBe('foo');
  });

  test('Retrieves an object', () => {
    const objectStorageService = interpret(
      createLocalStorageMachine({
        key: 'some object',
        deserialize: z.preprocess(
          (value) => (typeof value === 'string' ? JSON.parse(value) : {}),
          z.object({ foo: z.string() })
        ),
        serialize: JSON.stringify,
      })
    );
    objectStorageService.start();

    const value = objectStorageService.getSnapshot().context.value;
    //    ^?

    expect(value).toEqual({
      foo: 'bar',
    });
  });
});
