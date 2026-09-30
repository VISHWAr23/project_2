// User instruction: "Phase 5: Customer Visit Management - Create file/photo storage abstraction"
// Importers/callers: visits.service.ts, visits.module.ts
// Affected API: File storage for visit photo attachments (future Cloudinary / S3 integration)
// Data schemas: StorageService interface and mock/local provider implementation

import { Injectable } from '@nestjs/common';

export interface StorageResult {
  url: string;
  key?: string;
  mimetype?: string;
  size?: number;
}

export interface IStorageService {
  uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<StorageResult>;
  deleteFile(fileKeyOrUrl: string): Promise<boolean>;
}

@Injectable()
export class StorageService implements IStorageService {
  /**
   * Upload file abstraction - decoupled from specific cloud provider.
   * Can be replaced with Cloudinary, AWS S3, or GCS without touching business logic.
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<StorageResult> {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `visits/${Date.now()}_${sanitizedName}`;
    const simulatedUrl = `https://storage.lathikka.com/${key}`;

    return {
      url: simulatedUrl,
      key,
      mimetype: mimeType,
      size: fileBuffer.length,
    };
  }

  async deleteFile(fileKeyOrUrl: string): Promise<boolean> {
    return Boolean(fileKeyOrUrl);
  }
}
