export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export abstract class FileStoragePort {
  /**
   * Persists a group picture and returns its storage key (file name).
   */
  abstract saveGroupPicture(file: UploadedFilePayload): Promise<string>;

  /**
   * Removes a previously stored group picture. Accepts both the storage key
   * and legacy public paths. Missing files are ignored.
   */
  abstract deleteGroupPicture(picture: string): Promise<void>;

  /**
   * Converts a stored group picture key into a publicly reachable URL.
   * Legacy public paths and external URLs are returned unchanged.
   */
  abstract getGroupPictureUrl(picture: string | null): string | null;

  /**
   * Normalizes a client-provided picture reference into a storage key.
   */
  abstract normalizeGroupPictureKey(picture: string): string;
}
