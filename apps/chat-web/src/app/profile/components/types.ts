export type ProfileTabType =
  | 'account'
  | 'theme'
  | 'status'
  | 'notifications'
  | 'retention'
  | 'update-notes';

export interface DeviceSession {
  deviceId: string;
  userAgent: string;
  deviceInfo: string;
  ip: string;
  lastActive: string;
  notificationsEnabled: boolean;
}

export interface SchemaOption {
  id: string;
  name: string;
  lightName: string;
  darkName: string;
  colors: string[];
}
