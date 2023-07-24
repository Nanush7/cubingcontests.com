import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IUser } from '~/src/helpers/interfaces/User';
import { Role } from '~/src/helpers/enums';

@Schema({ timestamps: true })
class User implements IUser {
  @Prop({ required: true })
  personId: number;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: String, enum: Role }] })
  roles: Role[];
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
