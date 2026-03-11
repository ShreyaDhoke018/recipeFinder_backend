import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

export const MONGO_CLIENT = 'MONGO_CLIENT';
export const MONGO_DB = 'MONGO_DB';

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async (): Promise<MongoClient> => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error(
            '\n\n❌  MONGODB_URI is not set!\n' +
            '   Please add your MongoDB Atlas connection string to backend/.env\n' +
            '   Example: MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/recipe-app?retryWrites=true&w=majority\n'
          );
        }
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
        });
        await client.connect();
        console.log('✅  MongoDB Atlas connected successfully');
        return client;
      },
    },
    {
      provide: MONGO_DB,
      useFactory: (client: MongoClient): Db => {
        return client.db(); // uses DB name from connection string
      },
      inject: [MONGO_CLIENT],
    },
  ],
  exports: [MONGO_CLIENT, MONGO_DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private moduleRef: ModuleRef) {}

  async onApplicationShutdown() {
    const client = this.moduleRef.get<MongoClient>(MONGO_CLIENT);
    await client?.close();
    console.log('MongoDB connection closed');
  }
}
