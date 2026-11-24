import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';
import { MessageType } from '@modules/chat/domain/enums/chat-type.enum';

export class IntegrationPaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class GetIntegrationReportListQueryDto extends IntegrationPaginationQueryDto {
  @ApiPropertyOptional({
    enum: ReportStatus,
    default: ReportStatus.PENDING,
    description: 'Report status to return. Defaults to PENDING.',
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class IntegrationReportListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ReportType })
  type: ReportType;

  @ApiProperty()
  reporterId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  reportedUserId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  conversationId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class IntegrationReportMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ enum: MessageType })
  type: string;

  @ApiProperty({
    description: 'Platform user ID of the message sender.',
  })
  senderId: string;

  @ApiProperty()
  createdAt: string;
}

export class IntegrationPaginationMetaDto {
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

export class IntegrationReportListBaseResponseDto {
  @ApiProperty({ example: true })
  succeed: boolean;

  @ApiProperty({ example: 'Reports retrieved successfully' })
  message: string;

  @ApiProperty({ type: [IntegrationReportListItemDto] })
  data: IntegrationReportListItemDto[];

  @ApiProperty({ type: IntegrationPaginationMetaDto })
  meta: IntegrationPaginationMetaDto;
}

export class IntegrationReportMessagesBaseResponseDto {
  @ApiProperty({ example: true })
  succeed: boolean;

  @ApiProperty({
    example: 'Reported conversation messages retrieved successfully',
  })
  message: string;

  @ApiProperty({ type: [IntegrationReportMessageDto] })
  data: IntegrationReportMessageDto[];

  @ApiProperty({ type: IntegrationPaginationMetaDto })
  meta: IntegrationPaginationMetaDto;
}
