import { prisma } from "../lib/prisma";
import { pickNextReserveUserEvent } from "./pickNextReserveUserEvent";
import { notifyCreator } from "../utils/telegramNotify";
import { sendTelegramNotification } from "../utils/sendTelegramNotification";

/**
 * После освобождения мест в основном списке переводит участников из резерва,
 * пока не будет достигнут лимит или резерв не опустеет.
 */
export async function promoteReservesUntilFull(eventId: number): Promise<void> {
  for (let step = 0; step < 10000; step++) {
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        UserEvent: {
          include: { user: true },
        },
      },
    });

    if (!updatedEvent) throw new Error("Event not found");

    const totalMain = updatedEvent.UserEvent.reduce(
      (sum: number, ue: { mainParticipantsCount: number }) => sum + ue.mainParticipantsCount,
      0,
    );

    if (totalMain >= updatedEvent.limit) return;

    const reserveToPromote = pickNextReserveUserEvent(updatedEvent.UserEvent);

    if (!reserveToPromote) return;

    await prisma.userEvent.update({
      where: {
        userId_eventId: {
          userId: reserveToPromote.userId,
          eventId,
        },
      },
      data: {
        reserveParticipantsCount: { decrement: 1 },
        mainParticipantsCount: { increment: 1 },
      },
    });

    await notifyCreator(
      eventId,
      `🔄️ Участник из резерва перемещён в основной список события «${updatedEvent.title}».\n` +
        `👤 id ${reserveToPromote.user.telegramId}`,
    );

    await sendTelegramNotification(
      reserveToPromote.user.telegramId,
      `🎉 Освободилось место на мероприятии «${updatedEvent.title}»!\n` +
        `✅ Вы переведены в основной список участников.\n` +
        `📅 Дата: ${new Date(updatedEvent.date).toLocaleDateString("ru-RU", { timeZone: "UTC" })}\n` +
        `⏰ Время: ${new Date(updatedEvent.date).toLocaleTimeString("ru-RU", { timeZone: "UTC" })}\n` +
        `👤 Ваш Telegram ID: ${reserveToPromote.user.telegramId}`,
    );
  }
}
