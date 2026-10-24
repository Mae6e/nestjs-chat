import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ConversationType } from '@modules/chat/domain/enums/conversation-type.enum';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';

export class CreateGroupConversationHttpRequest {
  @ApiProperty({ example: 'Team', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @ApiProperty({ example: 'This is for happy girls.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional first message sent by the creator.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description:
      'Existing group picture file name or public path. Ignored when a picture file is uploaded.',
    example: '/uploads/group-pictures/0199c0f4-....png',
  })
  @IsOptional()
  @IsString()
  picture?: string;
}

export class CreateGroupConversationHttpResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ConversationType })
  type: ConversationType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Public URL of the group picture.',
  })
  picture: string | null;

  @ApiProperty({ enum: ConversationMemberRole })
  role: ConversationMemberRole;

  @ApiProperty()
  createdAt: string;
}
