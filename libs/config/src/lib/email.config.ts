import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.zoho.in',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure:
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '465',
  user: process.env.SMTP_USER || 'service@sailorlabs.in',
  pass: process.env.SMTP_PASS || 'Z69DGFnj4HRh',
}));
