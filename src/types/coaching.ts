/** Specialist rosters and workouts sent to rostered clients. */

import type { ClientWorkoutExercise } from "./client-workout";

export type CoachingStatus = "invited" | "active" | "declined" | "ended";

export interface CoachingRelationship {
  id: string;
  specialistId: string;
  specialistUserId: string;
  clientUserId: string;
  conversationId: string | null;
  specialistName: string;
  clientFirstName: string;
  status: CoachingStatus;
  invitedAt: string;
  respondedAt: string | null;
}

export type CoachWorkoutStatus = "sent" | "started" | "completed";

export interface CoachWorkout {
  id: string;
  relationshipId: string;
  specialistId: string;
  clientUserId: string;
  /** Local day the workout is planned for (YYYY-MM-DD). */
  dateKey: string;
  title: string;
  note: string;
  exercises: ClientWorkoutExercise[];
  status: CoachWorkoutStatus;
  /** Sets the client logged for these exercises. Null until they start. */
  clientLog: ClientWorkoutExercise[] | null;
  sentAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CoachingRelationshipRow {
  id: string;
  specialist_id: string;
  specialist_user_id: string;
  client_user_id: string;
  conversation_id: string | null;
  specialist_name: string;
  client_first_name: string;
  status: CoachingStatus;
  invited_at: string;
  responded_at: string | null;
}

export interface CoachWorkoutRow {
  id: string;
  relationship_id: string;
  specialist_id: string;
  client_user_id: string;
  date_key: string;
  title: string;
  note: string;
  exercises: unknown;
  status: CoachWorkoutStatus;
  client_log: unknown;
  sent_at: string;
  started_at: string | null;
  completed_at: string | null;
}
