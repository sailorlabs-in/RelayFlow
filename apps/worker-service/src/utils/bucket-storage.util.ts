import { Logger } from '@nestjs/common';

const logger = new Logger('BucketStorageUtil');

/**
 * Batch deletes files from the external bucket storage service.
 * @param urls List of file URLs to delete
 * @param bucketUrl Base bucket URL (e.g., https://bucket.umangsailor.com)
 */
export async function deleteBucketMedia(
  urls: string[],
  bucketUrl: string,
): Promise<{ deletedCount: number }> {
  if (!urls || urls.length === 0) {
    return { deletedCount: 0 };
  }

  const cleanBucketUrl = (
    bucketUrl || 'https://bucket.umangsailor.com'
  ).replace(/\/+$/, '');
  const prefix = `${cleanBucketUrl}/storage/`;

  const bucketGroups: { [bucket: string]: string[] } = {};
  let validCount = 0;

  for (const url of urls) {
    if (url && typeof url === 'string' && url.startsWith(prefix)) {
      const path = url.slice(prefix.length);
      const parts = path.split('/');
      if (parts.length >= 2) {
        const bucket = parts[0];
        const name = parts.slice(1).join('/');
        if (!bucketGroups[bucket]) {
          bucketGroups[bucket] = [];
        }
        bucketGroups[bucket].push(name);
        validCount += 1;
      }
    }
  }

  if (validCount === 0) {
    return { deletedCount: 0 };
  }

  try {
    for (const [bucket, names] of Object.entries(bucketGroups)) {
      // Delete in batches of 20 items
      for (let i = 0; i < names.length; i += 20) {
        const batch = names.slice(i, i + 20);
        await fetch(`${cleanBucketUrl}/files`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucket,
            names: batch,
          }),
        });
      }
    }
    logger.log(
      `🗑 [Bucket Storage] Successfully purged ${validCount} file(s) across buckets.`,
    );
  } catch (error) {
    logger.error(
      '❌ [Bucket Storage] Failed to delete files from storage:',
      error,
    );
  }

  return { deletedCount: validCount };
}
