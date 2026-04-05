import {httpClient} from '@/api/httpClient.ts';

type ChatMemberStatus = 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';

interface ChatMembership {
    chatId: string;
    status: ChatMemberStatus;
}

interface MembershipResponse {
    isMember: boolean;
    memberships: ChatMembership[];
}

export const checkMembership = async (): Promise<MembershipResponse> => {
    try {
        return await httpClient<MembershipResponse>('/checkMembership', {method: 'GET'});
    } catch (error) {
        console.error('Error in checkMembership:', error);
        throw error;
    }
};
