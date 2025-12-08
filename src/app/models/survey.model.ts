// models/survey.model.ts
export interface Survey {
  id: string;
  title: string;
  description?: string;
  options: string[];
  votes: number[];
}
