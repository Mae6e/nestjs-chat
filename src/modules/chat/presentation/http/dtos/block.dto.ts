import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockRequestBody {
  @ApiProperty()
  @IsNotEmpty()
  targetUserId: string;
}

export class BlockResponse {}
