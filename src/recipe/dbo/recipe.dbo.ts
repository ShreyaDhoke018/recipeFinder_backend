import { ObjectId } from 'mongodb';

export interface RecipeDbo {
  _id?: ObjectId;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  imageBase64?: string;        // user-uploaded image stored as base64
  sourceUrl?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  tags?: string[];
  likes: number;
  savedByUserIds: string[];    // users who bookmarked this
  isSaved: boolean;
  isUserCreated: boolean;      // true = created by a user (visible to all, editable by owner)
  isVegetarian?: boolean;
  source?: string;
  cuisine?: string;
  difficulty?: string;
  calories?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}
