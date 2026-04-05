import { httpClient } from '@/api/httpClient';

export type RemoveEventParticipantResponse = {
  message: string;
};

export async function removeEventParticipant(eventId: string, participantTelegramId: string) {
  const id = encodeURIComponent(participantTelegramId);
  return await httpClient<RemoveEventParticipantResponse>(`/events/${eventId}/participants/${id}`, {
    method: 'DELETE',
  });
}
