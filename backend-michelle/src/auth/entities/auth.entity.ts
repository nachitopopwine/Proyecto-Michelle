import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<Auth>;

@Schema({ timestamps: true, collection: 'users' })
export class Auth {
	@Prop({ required: true, unique: true, lowercase: true, trim: true })
	email: string;

	@Prop({ required: true, select: false })
	password: string;

	@Prop({ required: true, trim: true })
	name: string;

	@Prop({ trim: true })
	phone?: string;

	@Prop({ required: true, enum: ['PATIENT', 'ADMIN'], default: 'PATIENT' })
	role: 'PATIENT' | 'ADMIN';

	/** Fecha en que aceptó el aviso de privacidad de datos de salud */
	@Prop()
	consentAt?: Date;

	/** Notas internas de Michelle sobre el paciente (no visibles para el paciente) */
	@Prop({ select: false })
	adminNotes?: string;

	@Prop({ select: false })
	resetTokenHash?: string;

	@Prop({ select: false })
	resetTokenExpires?: Date;

	createdAt?: Date;
}

export const AuthSchema = SchemaFactory.createForClass(Auth);
