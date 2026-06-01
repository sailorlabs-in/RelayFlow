import { User } from '@chat-app/database';
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(email: string, passwordHash: string, displayName?: string): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('❌ Email is already registered');
    }

    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
    });

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async search(query: string): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.display_name ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
      .getMany();
  }
}
