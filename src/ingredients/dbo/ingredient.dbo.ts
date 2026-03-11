import { ObjectId } from 'mongodb';

export interface IngredientDbo {
  _id?: ObjectId;
  name: string;
  category: string;
  unit: string;
  imageUrl?: string;
}
