import { BaseHttpClient } from '@common/http-client/base-http.client';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformApiClient extends BaseHttpClient {
  constructor(http: HttpService) {
    super(http);
  }
}
