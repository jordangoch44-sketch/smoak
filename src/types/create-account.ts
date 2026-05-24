import type { AuthRole } from "@/types/auth";

export interface CreateAccountWizardState {
  accountType: AuthRole | null;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clientGoals: string[];
  clientCity: string;
  clientNeighborhood: string;
  clientBudget: string;
  clientTrainingStyle: string;
  specialistType: string;
  specialistCity: string;
  specialistNeighborhood: string;
  specialistFormat: string;
  specialistStartingPrice: string;
}

export interface CreateAccountProfile {
  accountType: AuthRole;
  firstName: string;
  lastName: string;
  email: string;
  clientGoals?: string[];
  clientCity?: string;
  clientNeighborhood?: string;
  clientBudget?: string;
  clientTrainingStyle?: string;
  specialistType?: string;
  specialistCity?: string;
  specialistNeighborhood?: string;
  specialistFormat?: string;
  specialistStartingPrice?: string;
  createdAt: string;
}

export const INITIAL_CREATE_ACCOUNT_STATE: CreateAccountWizardState = {
  accountType: null,
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  clientGoals: [],
  clientCity: "",
  clientNeighborhood: "",
  clientBudget: "",
  clientTrainingStyle: "",
  specialistType: "",
  specialistCity: "",
  specialistNeighborhood: "",
  specialistFormat: "",
  specialistStartingPrice: "",
};
