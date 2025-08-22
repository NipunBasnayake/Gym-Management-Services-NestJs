import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Member } from '../member/member.schema';
import { Model } from 'mongoose';
import { Attendance } from '../attendance/attendance.schema';
import { Payment } from '../payment/payment.schema';
import { MembersService } from '../member/members.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Member.name) private memberModel: Model<Member>,
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly memberService: MembersService,
    private readonly paymentService: PaymentService,
  ) {}

  async getStats(): Promise<any> {
    const totalMembers = await this.memberModel.countDocuments();
    const activeMembers = await this.memberModel.countDocuments({activeStatus: true});

    const today = new Date();
    today.setHours(0,0,0,0);
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    const todayAttendance = await this.attendanceModel.countDocuments({
      date: { $gte: today, $lt: t},
    });

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthRevenue = await this.paymentModel.aggregate([
      {$match: {paymentDate: {$gte: firstOfMonth}}},
      {$group: {_id: null, total: {$sum: '$amount'}}},
    ]);
    const monthlyRevenue = thisMonthRevenue[0]?.total || 0;

    // Fetch the Attendance Growth in current month and previus month
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthAttendance = await this.attendanceModel.countDocuments({
      date: { $gte: firstOfMonth },
    });
    const previousMonthAttendance = await this.attendanceModel.countDocuments({
      date: { $gte: previousMonthStart, $lt: previousMonthEnd },
    });
    const attendanceGrowth = previousMonthAttendance > 0
      ? ((currentMonthAttendance - previousMonthAttendance) / previousMonthAttendance) * 100
      : 0;

    // Getting the Revenue
    const previousMonthRevenue = await this.paymentModel.aggregate([
      { $match: { paymentDate: { $gte: previousMonthStart, $lt: previousMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const prevRevenue = previousMonthRevenue[0]?.total || 0;
    const revenueGrowth = prevRevenue > 0
      ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100
      : 0;

    // daily visit
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyVisits = await this.attendanceModel.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
    ]);
    const averageDailyVisits = dailyVisits.length > 0
      ? dailyVisits.reduce((sum, day) => sum + day.count, 0) / dailyVisits.length
      : 0;

    return {
      totalMembers,
      activeMembers,
      todayAttendance,
      thisMonthRevenue: monthlyRevenue,
      attendanceGrowth: attendanceGrowth.toFixed(1),
      revenueGrowth: revenueGrowth.toFixed(1),
      averageDailyVisits: Math.round(averageDailyVisits),
    };
  }

  async getRevenueData(filter: 'week' | 'month' | 'year'): Promise<any[]> {
    const today = new Date();
    let startDate = new Date();
    let groupBy = '';

    if (filter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      groupBy = '%Y-%m-%d';
    } else if (filter === 'month') {
      startDate.setDate(1);
      groupBy = '%Y-%U';
    } else if (filter === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      groupBy = '%Y-%m';
    }

    const data = await this.paymentModel.aggregate([
      { $match: { paymentDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: groupBy, date: '$paymentDate' } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map((item) => ({ label: item._id, revenue: item.revenue }));
  }

  async getAttendanceData(filter: 'week' | 'month' | 'year'): Promise<any[]> {
    const today = new Date();
    let startDate = new Date();
    let groupBy = '';

    if (filter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      groupBy = '%Y-%m-%d';
    } else if (filter === 'month') {
      startDate.setDate(1);
      groupBy = '%Y-%U';
    } else if (filter === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      groupBy = '%Y-%m';
    }

    const data = await this.attendanceModel.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: groupBy, date: '$date' } },
          members: { $addToSet: '$member' },
        },
      },
      {
        $project: {
          _id: 1,
          members: { $size: '$members' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map((item) => ({ label: item._id, members: item.members }));
  }
}