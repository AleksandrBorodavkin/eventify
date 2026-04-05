import { httpClient } from '@/api/httpClient.ts';
import type { CreateEventResponse, IEventWriteBody } from '@/types/eventTypes.ts';

export const createEvent = async (payload: IEventWriteBody): Promise<CreateEventResponse> => {
  return httpClient<CreateEventResponse>('/events', {
    method: 'POST',
    body: payload,
  });
};
