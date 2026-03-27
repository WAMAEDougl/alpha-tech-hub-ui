import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  getFileUrl(filename: string): string {
    const base = this.config.get('APP_URL', 'http://localhost:3000');
    return `${base}/uploads/${filename}`;
  }

  deleteFile(filename: string): void {
    const dest = this.config.get('UPLOAD_DEST', './uploads');
    const path = join(dest, filename);
    if (fs.existsSync(path)) fs.unlinkSync(path);
  }
}
