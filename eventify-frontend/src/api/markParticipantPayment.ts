import { httpClient } from '@/api/httpClient';

export type MarkParticipantPaymentResponse = {
  paid?: boolean;
  user?: unknown;
  event?: unknown;
};

export async function markParticipantPayment(
  eventId: string,
  body: { participantTelegramId: number; paid: boolean },
) {
  return await httpClient<MarkParticipantPaymentResponse>(`/events/${eventId}/payment`, {
    method: 'PATCH',
    body,
  });
}
