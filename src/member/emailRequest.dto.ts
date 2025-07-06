import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailRequestDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'QR code data is required' })
  qrCode: string; // Expected as data:image/png;base64,...
}
