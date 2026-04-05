import { Caption, Text } from '@telegram-apps/telegram-ui';
import { openLink } from '@tma.js/sdk-react';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';

import { getInitialChatMembership } from '@/api/getInitialChatMembership';

import './InitialChatJoinGate.css';

export type InitialChatJoinGateProps = {
  joinChatLink: string;
  /** После того как пользователь оказался в группе (автопроверка). */
  onUnlocked: () => void;
};

const POLL_MS = 4000;

export const InitialChatJoinGate: FC<InitialChatJoinGateProps> = ({
  joinChatLink,
  onUnlocked,
}) => {
  const onUnlockedRef = useRef(onUnlocked);
  onUnlockedRef.current = onUnlocked;

  const url = joinChatLink.trim();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { inGroup } = await getInitialChatMembership();
        if (cancelled) return;
        if (inGroup) {
          onUnlockedRef.current();
        }
      } catch {
        /* сеть — следующий цикл или возврат в приложение */
      }
    };

    void run();

    const intervalId = window.setInterval(() => void run(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const onFocus = () => void run();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <div className="initialChatJoinGate">
      <Text>
        Чтобы создавать события, вступите в группу. После вступления доступ проверится сам — вернитесь в
        приложение или подождите несколько секунд.
      </Text>

      <div className="initialChatJoinBox">
        <Caption level="2" className="initialChatJoinCaption">
          Ссылка на группу
        </Caption>
        <button type="button" className="initialChatJoinLink" onClick={() => openLink(url)}>
          {url}
        </button>
      </div>
    </div>
  );
};
