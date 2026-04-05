import { validate, parse } from '@tma.js/init-data-node';
import express, {
    type ErrorRequestHandler,
    type RequestHandler,
    type Response,
} from 'express';

import {
    createAuthError,
    mapInitDataValidationError,
} from "../auth/authErrorMapper";

require('dotenv').config()

/**
 * Sets init data in the specified Response object.
 * @param res - Response object.
 * @param initData - init data.
 */
function setInitData(res: Response, initData: any): void {
    res.locals.initData = initData;
}

/**
 * Extracts init data from the Response object.
 * @param res - Response object.
 * @returns Init data stored in the Response object. Can return undefined in case,
 * the client is not authorized.
 */
function getInitData(res: Response): any | undefined {
    // console.log('res.locals.initData---------------------------------------------------', res.locals.initData)
    return res.locals.initData;
}

/**
 * Middleware which authorizes the external client.
 * @param req - Request object.
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */
const authMiddleware: RequestHandler = (req, res, next) => {
    // We expect passing init data in the Authorization header in the following format:
    // <auth-type> <auth-data>
    // <auth-type> must be "tma", and <auth-data> is Telegram Mini Apps init data.
    const authHeader = req.header('authorization') || '';
    const [authType, authData = ''] = authHeader.split(' ');

    // Если нет заголовка или он пустой, пропускаем (может быть webhook или другие запросы)
    if (!authHeader || !authType) {
        // Проверяем, это webhook запрос?
        if (req.path === process.env.BOT_PATCH) {
            return next(); // Пропускаем webhook запросы
        }
        return next(createAuthError('AUTH_HEADER_MISSING'));
    }

    switch (authType) {
        case 'tma':
            try {
                // Проверяем наличие BOT_TOKEN
                if (!process.env.BOT_TOKEN) {
                    console.error('BOT_TOKEN не установлен в переменных окружения');
                    return next(new Error('Server configuration error'));
                }

                // Логирование для отладки
                console.log('BOT_TOKEN from env:', process.env.BOT_TOKEN?.substring(0, 20) + '...');
                console.log('Received authData length:', authData.length);
                console.log('Received authData (first 100 chars):', authData.substring(0, 100));

                // Validate init data.
                validate(authData, process.env.BOT_TOKEN, {
                    // We consider init data sign valid for 1 hour from their creation moment.
                    expiresIn: 3600,
                });
                try {
                    setInitData(res, parse(authData));
                } catch (parseErr: unknown) {
                    console.error('Init data parse error:', parseErr);
                    return next(createAuthError('INIT_DATA_PARSE_ERROR'));
                }
                next();
            } catch (e: unknown) {
                console.error('Auth validation error:', (e as Error)?.name, (e as Error)?.message);
                const mapped = mapInitDataValidationError(e);
                if (mapped) {
                    return next(createAuthError(mapped.code, mapped.error));
                }
                return next(createAuthError('INIT_DATA_VALIDATION_UNKNOWN'));
            }
            break;
        // ... other authorization methods.
        default:
            return next(createAuthError('AUTH_AUTH_TYPE_UNSUPPORTED'));
    }
};

/**
 * Middleware which shows the user init data.
 * @param _req
 * @param res - Response object.
 * @param next - function to call the next middleware.
 */

export { authMiddleware, getInitData };
