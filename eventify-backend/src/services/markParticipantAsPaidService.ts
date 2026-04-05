import { prisma } from "../lib/prisma";
import {getInitData} from "../middleware/authMiddleware";
import {IEvent} from "../interfaces/IEvent";

export const markParticipantAsPaidService = async (
    eventId: number,
    paid: boolean,
    participantTelegramId: number,
    currentUserTelegramId: number
) => {
    try {
        // 1. Проверяем, что текущий пользователь является создателем события
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { creatorId: true }
        });

        if (!event) {
            throw new Error('Event not found');
        }

        const currentUser = await prisma.user.findUnique({
            where: { telegramId: currentUserTelegramId.toString() }
        });

        if (!currentUser || event.creatorId !== currentUser.id) {
            throw new Error('Only event creator can mark participants as paid');
        }

        // 2. Находим участника по telegramId
        const participant = await prisma.user.findUnique({
            where: { telegramId: participantTelegramId.toString() }
        });

        if (!participant) {
            throw new Error('Participant not found');
        }

        // 3. Обновляем флаг paid в таблице UserEvent
        return await prisma.userEvent.update({
            where: {
                userId_eventId: {
                    userId: participant.id,
                    eventId: eventId
                }
            },
            data: {
                paid: paid
            },
            include: {
                user: true,
                event: true
            }
        });
    } catch (error) {
        console.error('Error in markParticipantAsPaidService:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};