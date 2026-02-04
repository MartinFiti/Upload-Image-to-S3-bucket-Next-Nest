import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Security Configuration
 *
 * These constants define the allowed file types and size limits
 * to prevent abuse and ensure only valid images are uploaded.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Maximum file size: 5MB (in bytes)
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * File Management Service (FMS)
 *
 * This service handles S3 operations using pre-signed URLs.
 *
 * What are Pre-Signed URLs?
 * -------------------------
 * Pre-signed URLs allow you to grant temporary access to S3 objects without
 * exposing your AWS credentials to the client. The URL contains authentication
 * information as query parameters and expires after a specified time.
 *
 * Benefits:
 * - Direct browser-to-S3 uploads (no server bandwidth needed)
 * - Temporary access control
 * - No AWS credentials exposed to the frontend
 *
 * LocalStack Support:
 * -------------------
 * This service supports both real AWS S3 and LocalStack for local development.
 * Set the S3_ENDPOINT environment variable to use LocalStack.
 *
 * Important: When running in Docker, we need two endpoints:
 * - S3_ENDPOINT: Internal Docker network URL (e.g., http://localstack:4566)
 * - S3_PUBLIC_ENDPOINT: URL accessible from the browser (e.g., http://localhost:4566)
 *
 * Pre-signed URLs use the public endpoint so browsers can upload directly.
 */
@Injectable()
export class FmsService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(FmsService.name);
  private readonly internalEndpoint: string | undefined;
  private readonly publicEndpoint: string | undefined;

  constructor() {
    // Internal endpoint for S3 client (Docker network)
    this.internalEndpoint = process.env.S3_ENDPOINT;
    // Public endpoint for pre-signed URLs (browser access)
    // Falls back to internal endpoint if not specified
    this.publicEndpoint =
      process.env.S3_PUBLIC_ENDPOINT || this.internalEndpoint;

    const isLocalStack = !!this.internalEndpoint;

    // Initialize S3 client - supports both real AWS and LocalStack
    this.s3Client = new S3Client({
      region: process.env.AWS_BUCKET_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || 'test',
        secretAccessKey: process.env.AWS_SECRET_KEY || 'test',
      },
      // LocalStack configuration
      ...(isLocalStack && {
        endpoint: this.internalEndpoint,
        forcePathStyle: true, // Required for LocalStack
      }),
    });

    this.bucketName = process.env.AWS_BUCKET_NAME || 'demo-bucket';

    this.logger.log(
      isLocalStack
        ? `Using LocalStack S3 (internal: ${this.internalEndpoint}, public: ${this.publicEndpoint})`
        : 'Using AWS S3',
    );
  }

  /**
   * Replace the internal LocalStack endpoint with the public one in pre-signed URLs.
   * This is needed because the browser can't access the Docker internal network.
   */
  private toPublicUrl(url: string): string {
    if (this.internalEndpoint && this.publicEndpoint) {
      return url.replace(this.internalEndpoint, this.publicEndpoint);
    }
    return url;
  }

  /**
   * Validate that the content type is an allowed image MIME type.
   *
   * @param contentType - The MIME type to validate
   * @throws BadRequestException if the content type is not allowed
   */
  validateContentType(contentType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType)) {
      throw new BadRequestException(
        `Invalid file type: ${contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validate that the file size is within the allowed limit.
   *
   * @param fileSize - The file size in bytes
   * @throws BadRequestException if the file size exceeds the limit
   */
  validateFileSize(fileSize: number): void {
    if (!fileSize || fileSize <= 0) {
      throw new BadRequestException('File size must be a positive number');
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      );
    }
  }

  /**
   * Generate a pre-signed URL for uploading a file to S3
   *
   * How it works:
   * 1. Client requests a pre-signed URL from this endpoint
   * 2. Server validates file type and size
   * 3. Server generates a URL with embedded credentials (valid for 30 min)
   * 4. Client uses this URL to upload directly to S3 via PUT request
   *
   * Security:
   * - Only allowed image MIME types are accepted
   * - File size is limited to MAX_FILE_SIZE_BYTES
   * - ContentLength is enforced in the pre-signed URL
   *
   * @param key - The S3 object key (file path in the bucket)
   * @param contentType - MIME type of the file being uploaded
   * @param fileSize - Size of the file in bytes
   * @returns Pre-signed URL for PUT operation
   */
  async getPreSignedURL(
    key: string,
    contentType: string,
    fileSize: number,
  ): Promise<string> {
    // Validate file type and size before generating URL
    this.validateContentType(contentType);
    this.validateFileSize(fileSize);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize, // Enforce exact file size
    });

    // URL expires in 30 minutes (1800 seconds)
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 1800 });

    // Convert internal Docker URL to public URL for browser access
    return this.toPublicUrl(url);
  }

  /**
   * Generate a pre-signed URL for viewing/downloading a file from S3
   *
   * This allows temporary read access to private S3 objects.
   * Useful for displaying images or downloading files without making them public.
   *
   * @param key - The S3 object key (file path in the bucket)
   * @returns Pre-signed URL for GET operation
   */
  async getPreSignedURLToViewObject(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // URL expires in 5 minutes (300 seconds) - shorter for read operations
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

    // Convert internal Docker URL to public URL for browser access
    return this.toPublicUrl(url);
  }

  /**
   * Delete an object from S3
   *
   * @param key - The S3 object key to delete
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}