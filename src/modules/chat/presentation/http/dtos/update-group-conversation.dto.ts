import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateGroupConversationHttpRequest {
  @ApiPropertyOptional({ example: 'Team', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @ApiProperty({ example: 'This is for happy girls.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Existing group picture file name or public path. Ignored when a picture file is uploaded.',
    example: '/uploads/group-pictures/0199c0f4-....png',
  })
  @IsOptional()
  @IsString()
  picture?: string;

  @ApiPropertyOptional({
    description: 'Set to true to remove the current group picture.',
    example: true,
  })
  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  removePicture?: boolean;
}

export class UpdateGroupConversationHttpResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Public URL of the group picture.',
  })
  picture: string | null;
}
