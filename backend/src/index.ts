import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
    getUsers,
    createUser,
    checkMembership,
    addUserToEvent,
    deleteUserFromEventController
} from './controllers/userController';
import {
    createEvent,
    getEventByIdWithUsersController,
    getEventsByUserTelegramIdController,
    getEventsController
} from "./controllers/eventController";
import {authMiddleware} from "./middleware/authMiddleware";

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet())
app.use(cors())
require("dotenv").config();
app.use(express.json());
app.use(authMiddleware)

app.get('/checkMembership', checkMembership);



// @ts-ignore
app.post('/events/:eventId/participants', addUserToEvent)

// @ts-ignore
app.delete('/events/:eventId/participants', deleteUserFromEventController)

    // Мероприятие с всеми участниками
app.get('/events/:eventId/participants',getEventByIdWithUsersController)


app.get('/users/:telegramId/events', getEventsByUserTelegramIdController)



// // Эндпоинты для User
app.get('/users', getUsers);
// app.get('/users/:id', getUserById);
app.post('/users', createUser);
// app.post('/users_event', addUserToEvent);
// app.put('/users/:id', updateUser);
// app.delete('/users/:id', deleteUser);
//
// // Эндпоинты для Event
app.get('/events', getEventsController);
// app.get('/events/:id', getEventById);
app.post('/events', createEvent);
// app.put('/events/:id', updateEvent);
// app.delete('/events/:id', deleteEvent);
//
// // Эндпоинты для связи User и Event
// app.post('/users/:userId/events/:eventId', addUserToEvent);
// app.delete('/users/:userId/events/:eventId', removeUserFromEvent);

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});