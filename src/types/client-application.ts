export type ClientApplicationStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "ARCHIVED";

/** Client Join Now questionnaire — admin review queue */
export interface ClientApplication {
  id: string;
  status: ClientApplicationStatus;
  email: string;
  fullName: string;
  phone: string;
  preferredCity: string;
  preferredNeighborhood: string;
  preferredZipCode: string;
  fitnessGoals: string[];
  preferredSpecialistCategories: string[];
  budget: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ClientApplicationSubmitInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredCity: string;
  preferredNeighborhood: string;
  preferredZipCode?: string;
  fitnessGoals: string[];
  preferredSpecialistCategories: string[];
  budget: string;
}
