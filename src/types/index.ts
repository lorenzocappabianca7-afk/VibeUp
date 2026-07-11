export type RsvpStatus = "pending" | "confirmed" | "declined";

export interface Party {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  guestCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  partyId: string;
  name: string;
  email?: string;
  rsvpStatus: RsvpStatus;
  notes?: string;
}

export interface Task {
  id: string;
  partyId: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}
