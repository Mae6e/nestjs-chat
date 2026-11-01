import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { v7 as uuidv7 } from 'uuid';
import { uploadConfig } from '@infrastructure/upload/upload.config';
import {
  FileStoragePort,
  UploadedFilePayload,
} from '@modules/chat/application/ports/file-storage.port';

const GROUP_PICTURES_FOLDER = 'group-pictures';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class LocalFileStorageAdapter implements FileStoragePort {
  private readonly logger = new Logger(LocalFileStorageAdapter.name);

  constructor(
    @Inject(uploadConfig.KEY)
    private readonly uploadConf: ConfigType<typeof uploadConfig>,
  ) {}

  async saveGroupPicture(file: UploadedFilePayload): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (file.size > this.uploadConf.maxFileSize) {
      throw new BadRequestException(
        `File is too large. Maximum size is ${this.uploadConf.maxFileSize} bytes`,
      );
    }

    const extension = this.resolveExtension(file);
    const directory = join(
      process.cwd(),
      this.uploadConf.dir,
      GROUP_PICTURES_FOLDER,
    );

    await mkdir(directory, { recursive: true });

    const filename = `${uuidv7()}${extension}`;
    await writeFile(join(directory, filename), file.buffer);

    this.logger.log(`Saved group picture: ${filename}`);

    return filename;
  }

  async deleteGroupPicture(picture: string): Promise<void> {
    const relativePath = this.toRelativeUploadPath(picture);
    if (!relativePath) {
      return;
    }

    const uploadRoot = resolve(process.cwd(), this.uploadConf.dir);
    const absolutePath = resolve(uploadRoot, relativePath);

    if (
      absolutePath !== uploadRoot &&
      !absolutePath.startsWith(`${uploadRoot}${sep}`)
    ) {
      return;
    }

    try {
      await unlink(absolutePath);
      this.logger.log(`Deleted group picture: ${relativePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getGroupPictureUrl(picture: string | null): string | null {
    const value = picture?.trim();
    if (!value) {
      return null;
    }

    if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
      return value;
    }

    const prefix = this.uploadConf.publicPrefix.replace(/\/+$/, '');

    if (value.startsWith(`${GROUP_PICTURES_FOLDER}/`)) {
      return `${prefix}/${value}`;
    }

    return `${prefix}/${GROUP_PICTURES_FOLDER}/${value}`;
  }

  normalizeGroupPictureKey(picture: string): string {
    const value = picture.trim();
    const prefix = this.uploadConf.publicPrefix.replace(/\/+$/, '');
    const groupPicturesPrefix = `${prefix}/${GROUP_PICTURES_FOLDER}/`;

    if (value.startsWith(groupPicturesPrefix)) {
      return value.slice(groupPicturesPrefix.length);
    }

    return value;
  }

  private resolveExtension(file: UploadedFilePayload): string {
    const byMime = ALLOWED_MIME_TYPES[file.mimetype];
    if (byMime) {
      return byMime;
    }

    const byName = extname(file.originalname ?? '').toLowerCase();
    if (Object.values(ALLOWED_MIME_TYPES).includes(byName)) {
      return byName;
    }

    throw new BadRequestException(
      'Unsupported image type. Allowed types: jpeg, png, webp, gif',
    );
  }

  private toRelativeUploadPath(picture: string): string | null {
    const value = picture?.trim();
    if (!value || /^https?:\/\//i.test(value)) {
      return null;
    }

    const prefix = `${this.uploadConf.publicPrefix.replace(/\/+$/, '')}/`;

    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }

    if (value.startsWith(`${GROUP_PICTURES_FOLDER}/`)) {
      return value;
    }

    if (!value.includes('/') && !value.includes('\\')) {
      return `${GROUP_PICTURES_FOLDER}/${value}`;
    }

    return value;
  }
}
