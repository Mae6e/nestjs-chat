export enum ChatIntegrationScope {
  REPORTS_READ = 'chat.reports.read',
}

export interface ValidatedIntegrationTokenPayload {
  sub: string;
  tokenUse: 'service';
  scopes: string[];
  exp?: number;
}

export abstract class ChatIntegrationAuthPort {
  abstract verifyToken(
    token: string,
  ): Promise<ValidatedIntegrationTokenPayload>;
}
