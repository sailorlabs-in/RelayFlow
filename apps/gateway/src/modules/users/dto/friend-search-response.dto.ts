import { ApiProperty } from '@nestjs/swagger';

export class FriendSearchResponseDto {
  @ApiProperty({ example: '56568887-b39d-4912-abeb-3c7d1457b7a9' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'demouser17', required: false })
  username?: string;

  @ApiProperty({ example: 'Demo User 17', required: false })
  displayName?: string;

  @ApiProperty({ example: 'http://example.com/avatar.jpg', required: false })
  avatarUrl?: string;

  @ApiProperty({ example: 'http://example.com/thumbnail.jpg', required: false })
  avatarThumbnailUrl?: string;

  @ApiProperty({ example: 'online' })
  status!: string;
}
