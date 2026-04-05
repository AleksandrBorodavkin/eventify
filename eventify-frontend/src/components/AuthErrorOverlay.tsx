import { Button, Placeholder, Text } from '@telegram-apps/telegram-ui';
import { miniApp, useSignal } from '@tma.js/sdk-react';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';

import {
  AUTH_ERROR_EVENT,
  type AuthErrorPayload,
} from '@/session/authApiError';

const HEADER_BY_CODE: Record<string, string> = {
  AUTH_HEADER_MISSING: 'Нет авторизации',
  AUTH_AUTH_TYPE_UNSUPPORTED: 'Ошибка авторизации',
  INIT_DATA_EXPIRED: 'Сессия истекла',
  INIT_DATA_AUTH_DATE_INVALID: 'Некорректные данные',
  INIT_DATA_SIGNATURE_INVALID: 'Подпись не подошла',
  INIT_DATA_SIGNATURE_MISSING: 'Нет подписи',
  INIT_DATA_HASH_INVALID: 'Некорректный формат',
  INIT_DATA_PARSE_ERROR: 'Ошибка разбора данных',
  INIT_DATA_VALIDATION_UNKNOWN: 'Ошибка проверки',
};

/**
 * Полноэкранное сообщение при 401 с телом { code, error } от API.
 */
export const AuthErrorOverlay: FC = () => {
  const [payload, setPayload] = useState<AuthErrorPayload | null>(null);
  const closeAvailable = useSignal(miniApp.close.isAvailable);

  useEffect(() => {
    const onAuthError = (ev: Event) => {
      const ce = ev as CustomEvent<AuthErrorPayload>;
      if (ce.detail?.message) setPayload(ce.detail);
    };
    window.addEventListener(AUTH_ERROR_EVENT, onAuthError);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, onAuthError);
  }, []);

  const onClose = useCallback(() => {
    miniApp.close();
  }, []);

  if (!payload) return null;

  const header = HEADER_BY_CODE[payload.code] ?? 'Ошибка доступа';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        background: 'var(--tgui--bg_color, var(--tg-theme-bg-color, #fff))',
      }}
    >
      <Placeholder
        header={header}
        description={payload.message}
        action={
          closeAvailable ? (
            <Button size="l" stretched onClick={onClose}>
              Закрыть
            </Button>
          ) : (
            <Text style={{ opacity: 0.75, textAlign: 'center' }}>
              Обновите страницу или откройте приложение снова из Telegram.
            </Text>
          )
        }
      />
    </div>
  );
};
