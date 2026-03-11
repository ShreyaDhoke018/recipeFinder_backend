export interface IRecipe {
  _id?: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  imageBase64?: string;
  sourceUrl?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  tags?: string[];
  likes?: number;
  savedByUserIds?: string[];
  isSaved?: boolean;
  isUserCreated?: boolean;
  isVegetarian?: boolean;
  source?: string;
  cuisine?: string;
  difficulty?: string;
  calories?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt?: Date;
}

export interface ISearchResult {
  recipes: IRecipe[];
  query: string;
  totalFound: number;
  page: number;
  totalPages: number;
}
