import { initData } from "@tma.js/sdk-react";

import { AuthApiError, dispatchAuthError } from "@/session/authApiError";
import {
  TELEGRAM_GROUP_IDS_INVALID_CODE,
  TelegramGroupIdsInvalidError,
} from "@/api/telegramGroupIdsError";

const API_DOMAIN = (import.meta.env.VITE_API_DOMAIN as string | undefined)?.replace(/\/+$/, "");

function resolveApiUrl(input: string) {
    // allow passing absolute URLs when needed
    if (/^https?:\/\//i.test(input)) return input;
    if (!API_DOMAIN) {
        throw new Error("Missing VITE_API_DOMAIN environment variable.");
    }
    const path = input.startsWith("/") ? input : `/${input}`;
    return `${API_DOMAIN}${path}`;
}


export type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'| undefined;
    headers?: Record<string, string>;
    body?: object;
};

export const httpClient = async <T>(
    url: string,
    options: RequestOptions = {}
): Promise<T> => {
    const { method = 'GET', headers = {}, body } = options;
    const initDataRaw = initData.raw();
    if (!initDataRaw) {
        throw new Error('Missing Telegram init data (initDataRaw).');
    }

    // Базовые настройки запроса
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `tma ${initDataRaw}`,
        ...headers, // Пользовательские заголовки
    };

    try {
        const resolvedUrl = resolveApiUrl(url);
        // Выполняем запрос
        const response = await fetch(resolvedUrl, {
            method,
            headers: defaultHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        // Проверяем статус ответа
        if (!response.ok) {
            if (response.status === 401) {
                const errorResponse = await response.json().catch(() => ({}));
                const code =
                    typeof (errorResponse as { code?: string }).code === "string"
                        ? (errorResponse as { code: string }).code
                        : "INIT_DATA_VALIDATION_UNKNOWN";
                const message =
                    typeof (errorResponse as { error?: string }).error === "string"
                        ? (errorResponse as { error: string }).error
                        : "Ошибка авторизации";
                dispatchAuthError({ code, message });
                throw new AuthApiError(code, message);
            }
            const errorResponse = await response.json().catch(() => ({}));
            const errBody = errorResponse as {
                code?: string;
                error?: string;
                invalidGroupIds?: string[];
            };
            if (
                response.status === 400 &&
                errBody.code === TELEGRAM_GROUP_IDS_INVALID_CODE &&
                typeof errBody.error === "string"
            ) {
                const ids = Array.isArray(errBody.invalidGroupIds)
                    ? errBody.invalidGroupIds.filter((x) => typeof x === "string")
                    : [];
                throw new TelegramGroupIdsInvalidError(errBody.error, ids);
            }
            if (errorResponse.error) {
                throw new Error(errorResponse.error);
            } else {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
        }

        // Если есть данные, парсим JSON
        return (await response.json()) as T;
    } catch (error) {
        console.error('HTTP Client Error:', error);
        throw error; // Пробрасываем ошибку дальше, чтобы вызывать обработчик в вызывающем коде
    }
};
