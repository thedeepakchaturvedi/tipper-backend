import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyBankDto {
  @IsString()
  @IsNotEmpty()
  tipper_id: string;
}
