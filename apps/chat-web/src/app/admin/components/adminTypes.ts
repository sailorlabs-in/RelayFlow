export interface UserData {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  warnings: string[];
  status: string;
  visibility?: string;
  lastSeen?: string | null;
  createdAt: string;
}

export interface GroupData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  memberCount: number;
  owner: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
  } | null;
}

export interface UpdateNoteData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    displayName?: string;
    username?: string;
    email: string;
  } | null;
}

export type AdminTabType = 'users' | 'groups' | 'update-notes';

export function formatLastSeen(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'never';
  }
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) {
      return 'recently';
    }
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      return 'just now';
    }
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    if (diffHr < 24) {
      return `${diffHr}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  } catch {
    return 'recently';
  }
}
