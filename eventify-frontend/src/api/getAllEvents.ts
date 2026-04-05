import { httpClient } from "@/api";
import type { IEvent } from "@/types/eventTypes";

export const getAllEvents = async () => {
  try {
    return await httpClient<IEvent[]>("/events/all", { method: "GET" });
  } catch (error) {
    console.error("Error in getAllEvents:", error);
    throw error;
  }
};

