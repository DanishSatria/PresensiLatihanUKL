// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(userData: { 
    username: string; 
    password: string; 
    nama_lengkap: string; 
    role?: string;
    kelas?: string;
    jabatan?: string;
  }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUser) {
      throw new ConflictException('Username sudah digunakan');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return this.prisma.user.create({
      data: {
        username: userData.username,
        password: hashedPassword,
        nama_lengkap: userData.nama_lengkap,
        role: userData.role || 'siswa',
        kelas: userData.kelas,
        jabatan: userData.jabatan,
      },
      select: {
        id: true,
        username: true,
        nama_lengkap: true,
        role: true,
        kelas: true,
        jabatan: true,
        created_at: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nama_lengkap: true,
        role: true,
        kelas: true,
        jabatan: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nama_lengkap: true,
        role: true,
        kelas: true,
        jabatan: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async update(id: number, userData: { 
    username?: string; 
    password?: string; 
    nama_lengkap?: string; 
    role?: string;
    kelas?: string;
    jabatan?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (userData.username && userData.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: userData.username },
      });
      if (existingUser) {
        throw new ConflictException('Username sudah digunakan');
      }
    }

    const data: any = { ...userData };
    if (userData.password) {
      data.password = await bcrypt.hash(userData.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        nama_lengkap: true,
        role: true,
        kelas: true,
        jabatan: true,
        created_at: true,
        updated_at: true,
      },
    });
  }
}