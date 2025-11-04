import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async create(@Request() req, @Body() data: any) {
    const userId = req.user.userId;
    return this.attendanceService.createAttendance(userId, data);
  }

  @Get('history/:user_id')
  async getHistory(@Param('user_id') userId: string) {
    return this.attendanceService.getUserHistory(parseInt(userId));
  }

  @Get('summary/:user_id')
  async getSummary(
    @Param('user_id') userId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.attendanceService.getMonthlySummary(
      parseInt(userId),
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  @Post('analysis')
  async getAnalysis(@Body() filters: any) {
    return this.attendanceService.getAttendanceAnalysis({
      start_date: new Date(filters.start_date),
      end_date: new Date(filters.end_date),
      role: filters.role,
      kelas: filters.kelas,
      jabatan: filters.jabatan,
    });
  }
}