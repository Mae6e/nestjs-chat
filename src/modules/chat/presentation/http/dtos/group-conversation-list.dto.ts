import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ConversationMemberRole } from '@modules/chat/domain/enums/conversation-member-role.enum';
import { ConversationMemberStatus } from '@modules/chat/domain/enums/conversation-member-status.enum';

export class GetGroupConversationListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive search by group title.',
    example: 'team',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}

export class GroupConversationListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  title: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Public URL of the group picture.',
  })
  picture: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  memberCount: number;

  @ApiProperty({
    description:
      'True when the current user created the group; false when another user created it.',
  })
  createdByMe: boolean;
}

export class MyGroupConversationListItemDto extends GroupConversationListItemDto {
  @ApiProperty({ enum: ConversationMemberStatus })
  status: ConversationMemberStatus;

  @ApiProperty({ enum: ConversationMemberRole })
  role: ConversationMemberRole;

  @ApiProperty()
  notSeenCount: number;
}

export class GroupConversationListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;
}

export class GroupConversationListResponseDto {
  @ApiProperty({ type: [GroupConversationListItemDto] })
  data: GroupConversationListItemDto[];

  @ApiProperty({ type: GroupConversationListMetaDto })
  meta: GroupConversationListMetaDto;
}

export class GroupConversationListBaseResponseDto {
  @ApiProperty({ example: 'Groups retrieved successfully' })
  message: string;

  @ApiProperty({ type: [GroupConversationListItemDto] })
  data: GroupConversationListItemDto[];

  @ApiProperty({ type: GroupConversationListMetaDto })
  meta: GroupConversationListMetaDto;
}

export class MyGroupConversationListResponseDto {
  @ApiProperty({ type: [MyGroupConversationListItemDto] })
  data: MyGroupConversationListItemDto[];

  @ApiProperty({ type: GroupConversationListMetaDto })
  meta: GroupConversationListMetaDto;
}

export class MyGroupConversationListBaseResponseDto {
  @ApiProperty({ example: 'My groups retrieved successfully' })
  message: string;

  @ApiProperty({ type: [MyGroupConversationListItemDto] })
  data: MyGroupConversationListItemDto[];

  @ApiProperty({ type: GroupConversationListMetaDto })
  meta: GroupConversationListMetaDto;
}
