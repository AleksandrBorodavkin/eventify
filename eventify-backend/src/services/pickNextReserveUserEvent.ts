/**
 * Следующий в очереди резерва: раньше по времени записи UserEvent, при равенстве — меньший userId.
 * Использовать везде, где из резерва переводят слот в основной список.
 */
export type UserEventReserveRow = {
  userId: number;
  reserveParticipantsCount: number;
  createdAt: Date | string;
  /** Prisma include user — нужен для уведомлений после promote */
  user?: { telegramId: string };
};

export function pickNextReserveUserEvent<T extends UserEventReserveRow>(
  userEvents: T[],
): T | undefined {
  const withReserve = userEvents.filter((ue) => ue.reserveParticipantsCount > 0);
  if (withReserve.length === 0) return undefined;
  return [...withReserve].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.userId - b.userId;
  })[0];
}
