import {Request, Response} from 'express';
import {
    getEventByIdWithUsersService,
    getEventsByUserTelegramIdService,
    decreaseParticipantsService,
    markParticipantAsPaidService,
    changeStatusEventService,
    addUserToEventService,
    removeParticipantByOrganizerService,
} from "../services";
import {getInitData} from "../middleware/authMiddleware";
import axios from "axios";
import {updateEventService} from "../services/updateEventService";
import {
    InvalidTelegramChatIdsError,
    TELEGRAM_GROUP_IDS_INVALID_CODE,
} from "../services/validateTelegramGroupIds";
import {canUserViewEvent} from "../services/eventVisibilityService";
import {paramId} from "../utils/paramId";


export const markParticipantAsPaidController = async (req: Request, res: Response) => {
    try {
        const eventId = Number(paramId(req.params.eventId));
        const {paid, participantTelegramId} = req.body;
        const currentUserTelegramId = getInitData(res).user.id// Получаем из аутентификации
        const result = await markParticipantAsPaidService(
            eventId,
            paid,
            participantTelegramId,
            currentUserTelegramId
        );
        res.status(200).json(result);
    } catch (error) {
        // @ts-ignore
        res.status(403).json({error: error.message}); // 403 Forbidden для ошибок прав
    }
}
// контроллер архивации
export const changeStatusEventController = async (req: Request, res: Response) => {
    try {
        const eventId = Number(paramId(req.params.eventId));
        const {status} = req.body;
        const userId = getInitData(res).user.id // Получаем из аутентификации

        const result = await changeStatusEventService(eventId, status, userId);
        res.json(result);
    } catch (error) {
        // @ts-ignore
        res.status(403).json({error: error.message}); // 403 Forbidden для ошибок прав
    }
};
export const getEventsByUserTelegramIdController = async (req: Request, res: Response) => {
    const telegramId = getInitData(res).user?.id;
    try {
        const eventList = await getEventsByUserTelegramIdService(String(telegramId));
        res.status(200).json(eventList);
    } catch (error: any) {
        res.status(500).json({error: error.message});
    }

};

export const getEventByIdWithUsersController = async (req: Request, res: Response) => {
    try {
        const viewerId = Number(getInitData(res).user.id);
        const eventId = paramId(req.params.eventId);
        const result = await getEventByIdWithUsersService(eventId);
        const allowed = await canUserViewEvent(
            viewerId,
            {
                creatorTelegramId: result.creator.telegramId,
                groupIds: result.groups.map((g) => g.chatId),
            },
            `GET /events/${eventId}/participants`,
        );
        if (!allowed) {
            console.warn("[eventVisibility] forbidden event detail", {
                eventId,
                viewerId,
            });
            return res.status(403).json({
                error: "Нет доступа к этому событию",
            });
        }
        res.status(200).json(result);
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(409).json({error: 'Event with this telegramId already exists.'});
        } else if (error.message === "Event not found") {
            res.status(404).json({ error: "Event not found" });
        } else {
            res.status(500).json({error: error.message});
        }
    }
}
export const addUserToEvent = async (req: Request, res: Response) => {
    try {
        const result = await addUserToEventService(req, res);
        if (res.headersSent) {
            return;
        }
        return res.status(200).json(result);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({error: 'User is already added to the event'});
        } else if (error.message === 'Лимит участников достигнут. Невозможно добавить нового участника.') {
            return res.status(400).json({error: error.message});
        } else {
            return res.status(500).json({error: error.message});
        }
    }
};

export const decreaseParticipantsController = async (req: Request, res: Response) => {
    try {
        const currentUser = getInitData(res).user;

        // Вызываем сервис для уменьшения количества участников
        const response = await decreaseParticipantsService(
            String(currentUser.id),
            parseInt(paramId(req.params.eventId), 10),
        );

        return res.json(response);
    } catch (error) {
        // @ts-ignore
        return res.status(400).json({ error: error.message });
    }
};

export const removeParticipantByOrganizerController = async (req: Request, res: Response) => {
    try {
        const eventId = Number(paramId(req.params.eventId));
        const participantTelegramId = Number(paramId(req.params.participantTelegramId));
        const organizerTelegramId = Number(getInitData(res).user.id);
        const result = await removeParticipantByOrganizerService(
            eventId,
            participantTelegramId,
            organizerTelegramId,
        );
        return res.status(200).json(result);
    } catch (error) {
        // @ts-ignore
        const msg = String((error as Error).message);
        if (msg.includes("Only event creator")) {
            return res.status(403).json({ error: msg });
        }
        return res.status(400).json({ error: msg });
    }
};

export const updateEventController= async (req: Request, res: Response) => {
    try {
        const currentUserTelegramId = getInitData(res).user.id;
        const eventId = Number(paramId(req.params.eventId));
        const updatedData = req.body;

        const result = await updateEventService(eventId, updatedData, currentUserTelegramId);
        res.json(result);
    } catch (error: any) {
        if (error instanceof InvalidTelegramChatIdsError) {
            res.status(400).json({
                code: TELEGRAM_GROUP_IDS_INVALID_CODE,
                error: error.message,
                invalidGroupIds: error.invalidIds,
            });
            return;
        }
        res.status(400).json({ error: error.message });
    }
}

export const checkMembership = async (req: Request, res: Response) => {
    try {
        const userId = getInitData(res).user?.id;
        if (!userId) throw new Error('User ID not found in init data');

        // Массив чатов для проверки
        const chatIds = Object.keys(process.env)
            .filter(key => key.startsWith('CHAT_ID_'))
            .map(key => process.env[key])
            .filter(Boolean);

        if (chatIds.length === 0) {
            throw new Error('No chat IDs configured for membership check');
        }

        const membershipChecks = chatIds.map(async (chatId) => {
            try {
                const response = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember`, {
                    params: {
                        chat_id: chatId,
                        user_id: userId,
                    },
                });
                return {
                    chatId,
                    status: response.data.result?.status,
                };
            } catch (error) {
                console.error(`Error checking membership for chat ${chatId}:`, error);

                // Правильная обработка ошибки с проверкой типа
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                return {
                    chatId,
                    status: 'error',
                    error: errorMessage
                };
            }
        });

        const results = await Promise.all(membershipChecks);

        // Проверяем все значимые статусы
        const isMember = results.some(result =>
            ['creator', 'administrator', 'member', 'restricted'].includes(result.status)
        );

        // Дополнительная информация о правах
        const isAdmin = results.some(result =>
            ['creator', 'administrator'].includes(result.status)
        );

        res.json({
            isMember,  // true если creator/administrator/member/restricted
            isAdmin,   // true если creator/administrator
            memberships: results,
        });


    } catch (error) {
        console.error('Failed to check user status in groups:', error);

        // Обработка ошибки в основном блоке catch
        const errorMessage = error instanceof Error ? error.message : 'Failed to check user status in groups';

        res.status(500).json({error: errorMessage});
    }
};