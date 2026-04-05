import { httpClient } from '@/api/httpClient';

export type SetEventParticipationResponse = {
  message: string;
  isReserve?: boolean;
};

export const setEventParticipation = async (
  eventId: string,
  shouldParticipate: boolean,
) => {
  return await httpClient<SetEventParticipationResponse>(`/events/${eventId}/participants`, {
    method: shouldParticipate ? 'POST' : 'PATCH',
    body: {},
  });
};

