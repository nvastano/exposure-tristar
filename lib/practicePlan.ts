export type RawPracticePlanDrillRow = {
  Id: string;
  Name: string;
  CreatedAt?: string;
};

export type RawPracticePlanRow = {
  Id: string;
  Date: string;
  CreatedAt?: string;
};

export type RawPracticePlanItemRow = {
  Id: string;
  PlanId: string;
  Name: string;
  Minutes: string | number;
  Order?: string | number;
  CreatedAt?: string;
  CategoryId?: string;
};

export type RawPracticePlanCategoryRow = {
  Id: string;
  Name: string;
  Order?: string | number;
  CreatedAt?: string;
};

export const PRACTICE_LENGTH_MINUTES = 240;
export const UNCATEGORIZED = "Uncategorized";
