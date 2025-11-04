import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async createAttendance(userId: number, data: { 
    tanggal?: Date;
    jam_masuk?: Date;
    status?: string;
    keterangan?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cek apakah sudah presensi hari ini
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        tanggal: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Anda sudah melakukan presensi hari ini');
    }

    return this.prisma.attendance.create({
      data: {
        user_id: userId,
        tanggal: data.tanggal || new Date(),
        jam_masuk: data.jam_masuk || new Date(),
        status: data.status || 'hadir',
        keterangan: data.keterangan,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nama_lengkap: true,
            role: true,
          },
        },
      },
    });
  }

  async getUserHistory(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return this.prisma.attendance.findMany({
      where: { user_id: userId },
      orderBy: { tanggal: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nama_lengkap: true,
            role: true,
          },
        },
      },
    });
  }

  async getMonthlySummary(userId: number, year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = (month || now.getMonth() + 1) - 1;

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        user_id: userId,
        tanggal: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDays = endDate.getDate();
    const hadir = attendances.filter(a => a.status === 'hadir').length;
    const sakit = attendances.filter(a => a.status === 'sakit').length;
    const izin = attendances.filter(a => a.status === 'izin').length;
    const alpha = totalDays - (hadir + sakit + izin);

    return {
      user_id: userId,
      bulan: targetMonth + 1,
      tahun: targetYear,
      total_hari: totalDays,
      hadir,
      sakit,
      izin,
      alpha,
      persentase_kehadiran: ((hadir / totalDays) * 100).toFixed(2) + '%',
    };
  }

  async getAttendanceAnalysis(filters: {
    start_date: Date;
    end_date: Date;
    role?: string;
    kelas?: string;
    jabatan?: string;
  }) {
    const whereClause: any = {
      tanggal: {
        gte: filters.start_date,
        lte: filters.end_date,
      },
    };

    if (filters.role || filters.kelas || filters.jabatan) {
      whereClause.user = {};
      if (filters.role) whereClause.user.role = filters.role;
      if (filters.kelas) whereClause.user.kelas = filters.kelas;
      if (filters.jabatan) whereClause.user.jabatan = filters.jabatan;
    }

    const attendances = await this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nama_lengkap: true,
            role: true,
            kelas: true,
            jabatan: true,
          },
        },
      },
    });

    // Group by user and calculate statistics
    const userStats = {};
    attendances.forEach(attendance => {
      const userId = attendance.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          user: attendance.user,
          total: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
        };
      }

      userStats[userId].total++;
      userStats[userId][attendance.status]++;
    });

    // Calculate percentages
    const result = Object.values(userStats).map((stat: any) => {
      const percentage = ((stat.hadir / stat.total) * 100).toFixed(2);
      return {
        ...stat,
        persentase_kehadiran: percentage + '%',
      };
    });

    return result;
  }
}