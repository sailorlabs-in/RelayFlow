import { User } from '@chat-app/database';
import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for active users by email or display name' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query string' })
  @ApiResponse({ status: 200, description: 'List of matching users.', type: [User] })
  async search(@Query('query') query: string): Promise<User[]> {
    return this.usersService.search(query || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by UUID' })
  @ApiParam({ name: 'id', description: 'User unique UUID' })
  @ApiResponse({ status: 200, description: 'User profile details.', type: User })
  async findById(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }
}
