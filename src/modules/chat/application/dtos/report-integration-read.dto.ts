import { ReportStatus } from '@modules/chat/domain/enums/report-status.enum';
import { ReportType } from '@modules/chat/domain/enums/report-type.enum';

export interface ReportIntegrationReadDto {
  id: string;
  type: ReportType;
  reporterId: string;
  reportedUserId: string | null;
  conversationId: string | null;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}
