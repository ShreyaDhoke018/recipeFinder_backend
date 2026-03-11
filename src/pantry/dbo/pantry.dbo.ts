import { ObjectId } from 'mongodb';

export interface PantryDbo {
  _id?: ObjectId;
  sessionId: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  createdAt: Date;
}
