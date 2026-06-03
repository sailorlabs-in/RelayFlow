import { PresenceStatus } from './enums';

export const PRESENCE_STATUS_DETAILS = [
  {
    id: PresenceStatus.ONLINE,
    name: 'Online',
    color: '#22c55e',
    desc: 'Active & receptive to messages',
  },
  {
    id: PresenceStatus.AWAY,
    name: 'Away',
    color: '#eab308',
    desc: 'Stepped away from keyboard',
  },
  {
    id: PresenceStatus.DND,
    name: 'DND',
    color: '#ef4444',
    desc: 'Muted — focus mode active',
  },
  {
    id: PresenceStatus.OFFLINE,
    name: 'Offline',
    color: '#71717a',
    desc: 'Invisible to all users',
  },
];

export const STATUS_TEXTS = {
  [PresenceStatus.ONLINE]: 'Online',
  [PresenceStatus.AWAY]: 'Away',
  [PresenceStatus.DND]: 'Do Not Disturb',
  [PresenceStatus.OFFLINE]: 'Offline',
};
