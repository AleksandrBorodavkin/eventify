import { httpClient } from '@/api/httpClient.ts';

export type InitialChatMembership = {
  inGroup: boolean;
  joinChatLink: string;
};

export async function getInitialChatMembership(): Promise<InitialChatMembership> {
  return httpClient<InitialChatMembership>('/me/initial-chat-membership', {
    method: 'GET',
  });
}
