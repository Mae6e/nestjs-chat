import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetFriendsQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Filter friends by whether they accept direct messages. Omit to return all friends.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isDmEnabled?: boolean;
}

export class ChatFriendDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  avatarIndex: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatar?: string;
}
