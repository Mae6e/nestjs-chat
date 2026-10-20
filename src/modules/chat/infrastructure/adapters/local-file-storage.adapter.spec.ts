import { BadRequestException } from '@nestjs/common';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LocalFileStorageAdapter } from './local-file-storage.adapter';
import { UploadedFilePayload } from '@modules/chat/application/ports/file-storage.port';

describe('LocalFileStorageAdapter', () => {
  const testUploadDir = `.tmp-uploads-${process.pid}-${Date.now()}`;
  const uploadRoot = join(process.cwd(), testUploadDir);
  const groupPicturesDir = join(uploadRoot, 'group-pictures');

  let adapter: LocalFileStorageAdapter;

  const pictureFile: UploadedFilePayload = {
    buffer: Buffer.from('image'),
    originalname: 'picture.png',
    mimetype: 'image/png',
    size: 5,
  };

  beforeEach(() => {
    adapter = new LocalFileStorageAdapter({
      dir: testUploadDir,
      publicPrefix: '/uploads',
      maxFileSize: 1024,
    });
  });

  afterEach(async () => {
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it('stores the file and returns only its name', async () => {
    const filename = await adapter.saveGroupPicture(pictureFile);

    expect(filename).not.toContain('/');
    expect(filename).toMatch(/\.png$/);
    await expect(
      access(join(groupPicturesDir, filename)),
    ).resolves.toBeUndefined();
  });

  it('builds public URLs from stored names', () => {
    expect(adapter.getGroupPictureUrl('picture.png')).toBe(
      '/uploads/group-pictures/picture.png',
    );
    expect(adapter.getGroupPictureUrl('group-pictures/picture.png')).toBe(
      '/uploads/group-pictures/picture.png',
    );
    expect(adapter.getGroupPictureUrl(null)).toBeNull();
  });

  it('keeps legacy paths and external URLs unchanged', () => {
    expect(
      adapter.getGroupPictureUrl('/uploads/group-pictures/legacy.png'),
    ).toBe('/uploads/group-pictures/legacy.png');
    expect(adapter.getGroupPictureUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('normalizes legacy public URLs into stored names', () => {
    expect(
      adapter.normalizeGroupPictureKey('/uploads/group-pictures/legacy.png'),
    ).toBe('legacy.png');
    expect(adapter.normalizeGroupPictureKey('picture.png')).toBe('picture.png');
    expect(
      adapter.normalizeGroupPictureKey('https://cdn.example.com/a.png'),
    ).toBe('https://cdn.example.com/a.png');
  });

  it('deletes files stored by name and by legacy public path', async () => {
    const filename = await adapter.saveGroupPicture(pictureFile);
    const legacyFilename = 'legacy.png';
    await mkdir(groupPicturesDir, { recursive: true });
    await writeFile(join(groupPicturesDir, legacyFilename), 'image');

    await adapter.deleteGroupPicture(filename);
    await adapter.deleteGroupPicture(
      `/uploads/group-pictures/${legacyFilename}`,
    );

    await expect(
      access(join(groupPicturesDir, filename)),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      access(join(groupPicturesDir, legacyFilename)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('ignores missing files and external URLs', async () => {
    await expect(
      adapter.deleteGroupPicture('missing.png'),
    ).resolves.toBeUndefined();
    await expect(
      adapter.deleteGroupPicture('https://cdn.example.com/a.png'),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported image types', async () => {
    await expect(
      adapter.saveGroupPicture({
        ...pictureFile,
        originalname: 'file.txt',
        mimetype: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
