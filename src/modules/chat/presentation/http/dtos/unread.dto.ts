import { ApiProperty } from '@nestjs/swagger';

export class HasUnreadMessagesResponse {
  @ApiProperty({
    description:
      'Whether the current user has at least one unread message in any active conversation.',
    example: true,
  })
  hasUnread: boolean;
}
