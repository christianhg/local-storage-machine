import { assign, createMachine } from 'xstate';
import { Schema } from 'zod';

export function createLocalStorageMachine<TValue>({
  key,
  deserialize,
  serialize,
}: {
  key: string;
  deserialize: Schema<TValue>;
  serialize: (value: TValue) => string;
}) {
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2BjAhsgBLALqgE6YwDE6yYmROAbtgK5gDaADALqKgAOqsAS3wDUAO24gAHogCcMgHQBGRQFYAHAHYVAJgAsuxbrYA2bQBoQAT0QqT8lQGZ9DtgcUOHe3QF9vFtFi4BMSkYPI8YKIQAqJQZOxcSCB8gsJiEtIInipKGtpaOmoyBsbGGhbWWWzyDoYOKooaZcZsGmwOxr7+GNh4hCQw8jD4wrH0TGBkUKj448jMCRIpQiLiSZk6DvLGuhqGOsZODnkViA4KMq3uWjKeMnnaXSABvcEDYcOjUHPMZABmmAEVAgOEIOGGP1YnCW-BW6XWZwM22MqnyKh2hkUMlOCG0Kl08jUukOJj2am02jKGieLyC-VC8gEECoZDeYBwojAAHdIYskss0mtQJkZET5LsZOoKRpdA0DDj3MZ5K1dGo2DI9GwTO0aT06SFBm8Yt8GPNJmyQZyeaaFtD+bDBRlZBoFDL7m6mg4ijivQp2oo1GoVDJVPd1J0-M89X0DWEjWMbZMAUDIKDUDGiOyrby7bwHasnQg2gT8UYvU4TI0VDi8QSiSSygGKcY1LrAhmGZRqERjZCyBAxGEYnRUABrMK0juDLs0XuJhDDnqChJ8vOpAsIhA6Ov1DUefStEM4hpKr2GXQUgyXC++SOiVAQOASSdvUIw9fw4U2RRKVSabcGEYpjVlYiAALSKHiSiOIcIaqh0F4Rt07avoMERRMa75wkKUhnO49g7C2wZqIoLQaGoOJgccyIuocHjGMGpRBm2rz0oMnxzhMWGOpu+QaPYihamw9a7AGig4pK9gXrY+SStonjaIoLH6u8jLMmA3Ebl+W4uvY2hyB0GjkQYGgODWRnbJswmtGUF46pGL5sXG-ScWammfrhCD3NollMW0FIBk4Nb4tBKIoiGMimORSFRihTnyDOPYJlx9ofjhmTaIGhLaMJewNKoJgUaBW6GEolxtC0+Tyaqt7eEAA */
  const machine = createMachine<
    { value?: TValue },
    | { type: 'got value'; value: TValue }
    | { type: 'failed to get value' }
    | { type: 'store new value'; value: TValue }
    | { type: 'stored new value'; value: TValue }
    | { type: 'failed to store new value' }
    | { type: 'clear value' },
    {
      value:
        | 'pending'
        | 'getting value'
        | 'idle'
        | 'storing value'
        | 'clearing value';
      context: { value?: TValue };
    }
  >(
    {
      id: 'local storage',
      predictableActionArguments: true,
      preserveActionOrder: true,
      initial: 'pending',
      context: {
        value: undefined,
      },
      on: {
        'clear value': { target: 'clearing value' },
      },
      states: {
        pending: { always: { target: 'getting value' } },
        'getting value': {
          invoke: {
            src: 'getValue',
          },
          on: {
            'got value': {
              actions: ['assign value'],
              target: 'idle',
            },
            'failed to get value': {
              actions: ['clear assigned value'],
              target: 'idle',
            },
          },
        },
        idle: {
          on: {
            'store new value': { target: 'storing value' },
          },
        },
        'storing value': {
          invoke: {
            src: 'storeValue',
          },
          on: {
            'stored new value': {
              actions: ['assign value'],
              target: 'idle',
            },
            'failed to store new value': {
              actions: ['clear assigned value'],
              target: 'idle',
            },
          },
        },
        'clearing value': {
          invoke: {
            src: 'clearValue',
            onDone: {
              actions: ['clear assigned value'],
              target: 'idle',
            },
          },
        },
      },
    },
    {
      actions: {
        'clear assigned value': assign({
          value: (context) => undefined,
        }),
        'assign value': assign({
          value: (context, event) =>
            event.type === 'got value' || event.type === 'stored new value'
              ? event.value
              : context.value,
        }),
      },
      services: {
        getValue: () => async (send) => {
          try {
            const value = deserialize.parse(
              localStorage.getItem(key) ?? undefined
            );

            send({ type: 'got value', value });
          } catch {
            send({ type: 'failed to get value' });
          }
        },
        storeValue: (context, event) => async (send) => {
          try {
            if (event.type === 'store new value') {
              localStorage.setItem(key, serialize(event.value));

              send({ type: 'stored new value', value: event.value });
            } else {
              throw new Error('Unable to store unknown value');
            }
          } catch {
            send({ type: 'failed to store new value' });
          }
        },
        clearValue: () => () => {
          return Promise.resolve(localStorage.removeItem(key));
        },
      },
    }
  );

  return machine;
}
