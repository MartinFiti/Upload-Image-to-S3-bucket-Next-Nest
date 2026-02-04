import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import {
  FmsService,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './fms.service';

/**
 * File Management System Controller
 *
 * This controller exposes endpoints for generating pre-signed URLs.
 * The frontend uses these URLs to upload/view files directly from S3.
 *
 * Security:
 * - Only image files are allowed (jpeg, png, gif, webp)
 * - Maximum file size: 5MB
 *
 * Flow for uploading:
 * 1. Frontend calls GET /fms/presigned-url/upload with file key, content type, and size
 * 2. Backend validates file type and size
 * 3. Backend generates and returns a pre-signed URL
 * 4. Frontend uses the URL to PUT the file directly to S3
 *
 * Flow for viewing:
 * 1. Frontend calls GET /fms/presigned-url/view with the file key
 * 2. Backend generates and returns a pre-signed URL for reading
 * 3. Frontend uses the URL as an image src or download link
 */
@Controller('fms')
export class FmsController {
  constructor(private readonly fmsService: FmsService) {}

  /**
   * Get the upload constraints (allowed file types and max size)
   *
   * Frontend can call this to know what files are acceptable before upload.
   *
   * @returns Object with allowed MIME types and max file size
   *
   * @example
   * GET /fms/upload-constraints
   * Response: { allowedMimeTypes: [...], maxFileSizeBytes: 5242880 }
   */
  @Get('upload-constraints')
  getUploadConstraints() {
    return {
      allowedMimeTypes: ALLOWED_MIME_TYPES,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      maxFileSizeMB: MAX_FILE_SIZE_BYTES / (1024 * 1024),
    };
  }

  /**
   * Get a pre-signed URL for uploading a file to S3
   *
   * @param key - The S3 object key (e.g., "profile/username123.jpg")
   * @param contentType - The MIME type (e.g., "image/jpeg")
   * @param fileSize - The file size in bytes
   * @returns Pre-signed URL string for PUT operation
   *
   * @example
   * GET /fms/presigned-url/upload?key=profile/john123.jpg&contentType=image/jpeg&fileSize=102400
   */
  @Get('presigned-url/upload')
  async getPreSignedURL(
    @Query('key') key: string,
    @Query('contentType') contentType: string,
    @Query('fileSize', ParseIntPipe) fileSize: number,
  ): Promise<string> {
    return this.fmsService.getPreSignedURL(key, contentType, fileSize);
  }

  /**
   * Get a pre-signed URL for viewing/downloading a file from S3
   *
   * @param key - The S3 object key to retrieve
   * @returns Pre-signed URL string for GET operation
   *
   * @example
   * GET /fms/presigned-url/view?key=profile/john123.jpg
   */
  @Get('presigned-url/view')
  async getPreSignedURLToViewObject(@Query('key') key: string): Promise<string> {
    return this.fmsService.getPreSignedURLToViewObject(key);
  }
}
