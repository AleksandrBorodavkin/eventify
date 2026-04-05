import { httpClient } from '@/api/httpClient';

export type SavedGroupChat = {
  chatId: string;
  label: string;
};

export type MySavedGroupsResponse = {
  groups: SavedGroupChat[];
};

export const getMySavedGroups = async () => {
  return httpClient<MySavedGroupsResponse>('/me/saved-groups', { method: 'GET' });
};
