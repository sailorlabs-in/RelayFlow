export const SystemEvents = {
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_READ: 'message.read',
  TYPING_STARTED: 'typing.started',
  TYPING_STOPPED: 'typing.stopped',
} as const;

export type SystemEvent = typeof SystemEvents[keyof typeof SystemEvents];
