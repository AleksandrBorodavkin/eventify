import {httpClient} from "@/api/httpClient.ts";
import type { EventDetails } from "@/types/eventDetailsTypes";

export const getEventDetail = async (eventId: string) => {

    try {
        return await httpClient<EventDetails>(`/events/${eventId}/participants`, {method: 'GET'});
    } catch (error) {
        console.error('Error in checkMembership:', error);
        throw error;
    }
}


