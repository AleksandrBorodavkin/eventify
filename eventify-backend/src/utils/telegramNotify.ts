import { prisma } from "../lib/prisma";
import {sendTelegramNotification} from './sendTelegramNotification'; // путь к твоей функции

/**
 * Уведомляет создателя события по его eventId
 */
export const notifyCreator = async (eventId: number, message: string) => {
    try {
        const event = await prisma.event.findUnique({
            where: {id: eventId},
            select: {
                title: true,
                creator: {
                    select: {
                        telegramId: true
                    }
                }
            }
        });
        const finalEvent = await prisma.event.findUnique({
            where: {id: eventId},
            include: {UserEvent: true},
        });
        // const creator = await prisma.user.findUnique({
        //     where: {id: event.creatorId},
        // });


        const totalMain = finalEvent?.UserEvent.reduce(
            (sum: number, ue: any) => sum + ue.mainParticipantsCount,
            0
        ) || 0;
        const totalReserve = finalEvent?.UserEvent.reduce(
            (sum: number, ue: any) => sum + ue.reserveParticipantsCount,
            0
        ) || 0;
        if (event?.creator?.telegramId) {
            const fullMessage =
                `${message}\n` +
                "\n" +
                `❗Уведомление только для организатора\n` +
                `🔔 Событие: «${finalEvent?.title}»\n` +
                `👥 Лимит участников: ${finalEvent?.limit}\n` +
                `👤 Основных участников: ${totalMain}\n` +
                `⏳ В резерве: ${totalReserve}\n`
            ;
            await sendTelegramNotification(event.creator.telegramId, fullMessage);
        }
    } catch (err) {
        console.error('Ошибка при отправке уведомления создателю:', err);
    }
};
