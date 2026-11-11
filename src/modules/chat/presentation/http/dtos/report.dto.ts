import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReportDirectMessageHttpRequest {
  @ApiProperty({
    description: 'Id of the direct conversation where the report happened.',
  })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;
}

export class ReportDirectMessageHttpResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: string;
}
