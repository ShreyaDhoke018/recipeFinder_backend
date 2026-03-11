export interface IUser {
  id?: string;
  name: string;
  email: string;
  savedRecipes?: string[];
  pantry?: Array<{ name: string; quantity: string; unit: string }>;
}
