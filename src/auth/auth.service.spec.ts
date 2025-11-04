import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private bcrypt: BcryptService,
  ) {}

  // REGISTER (buat user baru)
  async register(createAuthDto: CreateAuthDto) {
    const { name, email, password } = createAuthDto;

    // cek apakah email sudah terdaftar
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new UnauthorizedException('Email sudah digunakan');
    }

    // hash password
    const hashedPassword = await this.bcrypt.hashPassword(password);

    // simpan ke database
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { message: 'User berhasil dibuat', user };
  }

  // LOGIN
  async login(email: string, password: string) {
    // cari user berdasarkan email
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Email tidak ditemukan');
    }

    // bandingkan password
    const isMatch = await this.bcrypt.comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Password salah');
    }

    // kalau benar
    return { message: 'Login berhasil', user };
  }
}
