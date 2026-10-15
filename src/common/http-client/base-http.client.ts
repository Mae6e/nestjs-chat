import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export class BaseHttpClient {
  constructor(private readonly http: HttpService) {}

  async get<T>(url: string, params?: object): Promise<T> {
    const res = await firstValueFrom(this.http.get<T>(url, { params }));
    return res.data;
  }

  async post<T>(url: string, body?: object): Promise<T> {
    const res = await firstValueFrom(this.http.post<T>(url, body));
    return res.data;
  }

  async getOrNull<T>(url: string, params?: object): Promise<T | null> {
    try {
      return await this.get<T>(url, params);
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  }
}
