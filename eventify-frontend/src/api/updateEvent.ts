import { httpClient } from '@/api/httpClient';
import type { IEvent } from '@/types/eventTypes';

export type UpdateEventBody = {
  title?: string;
  description?: string;
  date?: string;
  limit?: number;
  status?: boolean;
  allowMultipleSlotsPerUser?: boolean;
  groupIds?: string[];
  groupLabels?: Record<string, string>;
};

export type UpdateEventResponse = {
  event: IEvent;
  message: string;
};

export const updateEvent = async (eventId: string, body: UpdateEventBody) => {
  return httpClient<UpdateEventResponse>(`/event/${eventId}`, {
    method: 'PATCH',
    body,
  });
};
