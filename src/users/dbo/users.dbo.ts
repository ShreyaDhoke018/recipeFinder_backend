import { ObjectId } from 'mongodb';

export interface UserDbo {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;        // bcrypt hashed
  savedRecipeIds: string[]; // recipe IDs this user saved
  createdAt: Date;
}
