import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  bucketUrl: process.env.BUCKET_URL || 'https://bucket.umangsailor.com',
}));
