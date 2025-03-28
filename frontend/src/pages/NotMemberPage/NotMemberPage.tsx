import {FC} from "react";
import './NotMemberPage.css'
import {Divider, Placeholder, Section, Text} from "@telegram-apps/telegram-ui";


export const NotMemberPage: FC = () => {
    return (
        <Section header={'Вам нужно быть членом группы...'}
                 footer={'Подпишитесь для продолжения.'}
                 className={'centre section'}>
            <Divider />
            <Placeholder
                description="Приложение помогает регистрироваться на мероприятия и предоставляет дополнительные функции, такие как напоминания о событиях, персонализированные рекомендации и удобный доступ к деталям мероприятий."
                header="Eventify"
            >
            </Placeholder>

            <Text>
                <a href='https://t.me/devchat1571'>@devchat1571</a>
            </Text>
        </Section>
    );
};