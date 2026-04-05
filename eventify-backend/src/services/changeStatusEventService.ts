import { prisma } from "../lib/prisma";

export const changeStatusEventService = async (
    eventId: number,
    status: boolean,
    telegramId: number // Получаем telegramId из сессии/токена
) => {
    // 1. Находим пользователя по telegramId
    const user = await prisma.user.findUnique({
        where: {
            telegramId: String(telegramId) // Конвертируем в строку согласно схеме
        },
        select: {id: true}
    });

    if (!user) {
        throw new Error('User not found');
    }

    // 2. Находим событие и проверяем создателя
    const event = await prisma.event.findUnique({
        where: {id: eventId},
        select: {
            creatorId: true
        }
    });

    if (!event) {
        throw new Error('Event not found');
    }

    // 3. Сравниваем ID создателя события с ID пользователя из БД
    if (event.creatorId !== user.id) {
        throw new Error('Only event owner can modify the event');
    }

    // 4. Обновляем статус
    return prisma.event.update({
        where: {id: eventId},
        data: {status},
        select: {
            id: true,
            title: true,
            status: true
        }
    });
};