import "dotenv/config";
import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
    checkMembership,
    addUserToEvent,
    getEventByIdWithUsersController,
    getEventsByUserTelegramIdController,
    changeStatusEventController,
    markParticipantAsPaidController,
    decreaseParticipantsController,
    removeParticipantByOrganizerController,
    updateEventController,

} from './controllers/Controller';
import {
    createEventController,
    getAllEventsController,
    getInitialChatMembershipController,
    getMySavedGroupsController,
} from "./controllers/eventsController";

import {
    isAuthErrorCode,
    mapInitDataValidationError,
    messageForCode,
} from "./auth/authErrorMapper";
import {authMiddleware} from "./middleware/authMiddleware";
import { bot, setupBot } from "./bot";
import { webhookCallback } from "grammy";
import axios from "axios";
import { assertInitialChatEnvOrExit } from "./config/initialChatEnv";

assertInitialChatEnvOrExit();

const app = express();
const port = process.env.PORT || 3000;

setupBot();
app.use(express.json());
if (process.env.BOT_PATCH) {
    app.use(process.env.BOT_PATCH, webhookCallback(bot, "express"));
} else {
    console.warn("BOT_PATCH is not set; Telegram webhook route is not mounted.");
}
app.use(helmet())
app.use(cors())
app.use(authMiddleware)

app.get('/checkMembership', checkMembership);

app.patch('/events/:eventId/payment', markParticipantAsPaidController)

// @ts-ignore
app.post('/events/:eventId/participants', addUserToEvent)
// @ts-ignore
app.patch('/events/:eventId/participants', decreaseParticipantsController)
app.delete('/events/:eventId/participants/:participantTelegramId', removeParticipantByOrganizerController)

app.put('/events/:eventId/status',changeStatusEventController)


    // Мероприятие с всеми участниками
app.get('/events/:eventId/participants',getEventByIdWithUsersController)


// app.get('/users/:telegramId/events', getEventsByUserTelegramIdController)



// // Эндпоинты для User
// app.get('/users', getUsers);
// app.get('/users/:id', getUserById);
// app.post('/users', addUser);
// app.post('/users_event', addUserToEvent);
// app.put('/users/:id', updateUser);
// app.delete('/users/:id', deleteUser);
//
// // Эндпоинты для Event
app.get('/me/saved-groups', getMySavedGroupsController);
app.get('/me/initial-chat-membership', getInitialChatMembershipController);
app.get('/events', getEventsByUserTelegramIdController);
app.get('/events/all', getAllEventsController);
// app.get('/events/:id', getEventById);
app.post('/events', createEventController);
app.patch('/event/:eventId', updateEventController);
// app.put('/events/:id', updateEvent);
// app.delete('/events/:id', deleteEvent);
//
// // Эндпоинты для связи User и Event
// app.post('/users/:userId/events/:eventId', addUserToEvent);
// app.delete('/users/:userId/events/:eventId', removeUserFromEvent);

// Error handling middleware (должен быть последним, после всех routes)
const errorHandler: ErrorRequestHandler = (err: any, req, res, next) => {
    console.error('Error:', err);

    const withAuthCode = err as { authCode?: string };
    if (withAuthCode.authCode && isAuthErrorCode(withAuthCode.authCode)) {
        const code = withAuthCode.authCode;
        res.status(401).json({
            code,
            error: err.message || messageForCode(code),
        });
        return;
    }

    const mapped = mapInitDataValidationError(err);
    if (mapped) {
        res.status(401).json({ code: mapped.code, error: mapped.error });
        return;
    }

    // Общая ошибка сервера
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
};
app.use(errorHandler);

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    void (async () => {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (!webhookUrl) {
            console.warn("WEBHOOK_URL is not set; skipping setWebhook call.");
            return;
        }
        try {
            const response = await axios.post(
                `https://api.telegram.org/bot${bot.token}/setWebhook`,
                { url: webhookUrl },
            );
            console.log("Webhook установлен:", response.data);
        } catch (err: any) {
            console.error("Ошибка установки webhook:", err.response?.data || err.message);
        }
    })();
});