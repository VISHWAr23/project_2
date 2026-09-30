import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const user = new this.userModel({
      ...userData,
      passwordHash,
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
