import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnblockRequestParams {
  @ApiProperty()
  @IsNotEmpty()
  targetUserId: string;
}

export class UnblockResponse {}
