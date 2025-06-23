import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance } from './attendance.schema';
import { AttendanceDto } from './attendance.dto';
import { MembersService } from '../member/members.service';
import { NotificationsService } from '../notification/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    private membersService: MembersService,
    private notificationsService: NotificationsService,
  ) {}

  async createOrUpdateAttendance(memberId: string): Promise<AttendanceDto> {
    console.log('AttendanceService: createOrUpdateAttendance called with memberId:', memberId);
    if (!memberId) {
      console.log('AttendanceService: Member ID is null');
      throw new HttpException('Member ID cannot be null', HttpStatus.BAD_REQUEST);
    }

    if (!Types.ObjectId.isValid(memberId)) {
      console.log('AttendanceService: Invalid memberId format:', memberId);
      throw new BadRequestException('Invalid memberId format. Must be a valid MongoDB ObjectId.');
    }

    const member = await this.membersService.getById(memberId);
    if (!member) {
      console.log('AttendanceService: Member not found for ID:', memberId);
      throw new HttpException(`Member not found with ID: ${memberId}`, HttpStatus.NOT_FOUND);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day
    const now = new Date();

    console.log('AttendanceService: Checking for existing attendance for memberId:', memberId, 'on date:', today);
    const existing = await this.attendanceModel
      .findOne({ member: new Types.ObjectId(memberId), date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } })
      .exec();

    let attendance: Attendance;
    if (existing) {
      console.log('AttendanceService: Found existing attendance:', existing._id);
      if (existing.timeOut) {
        console.log('AttendanceService: Time-out already marked for today');
        throw new HttpException('Already marked time-out for today', HttpStatus.CONFLICT);
      }
      if (now <= existing.timeIn) {
        console.log('AttendanceService: Invalid time sequence');
        throw new HttpException('Invalid time sequence: time-out cannot be before time-in', HttpStatus.CONFLICT);
      }
      existing.timeOut = now;
      attendance = await existing.save();
      console.log('AttendanceService: Updated time-out for attendance:', attendance._id);

      // Create notification for time-out
      await this.notificationsService.create({
        message: `Member ${member.name} (${member.email}) marked time-out`,
        type: 'ATTENDANCE_TIME_OUT',
      });
      console.log('AttendanceService: Created time-out notification for member:', member.email);
    } else {
      attendance = new this.attendanceModel({
        member: new Types.ObjectId(memberId),
        date: today,
        timeIn: now,
      });
      await attendance.save();
      console.log('AttendanceService: Created new attendance:', attendance._id);

      // Create notification for time-in
      await this.notificationsService.create({
        message: `Member ${member.name} (${member.email}) marked time-in`,
        type: 'ATTENDANCE_TIME_IN',
      });
      console.log('AttendanceService: Created time-in notification for member:', member.email);
    }

    return this.mapToDto(attendance);
  }

  async getAll(): Promise<AttendanceDto[]> {
    const attendances = await this.attendanceModel.find().populate('member').exec();
    return attendances.map(attendance => this.mapToDto(attendance));
  }

  async getById(id: string): Promise<AttendanceDto> {
    console.log('AttendanceService: Fetching attendance by ID:', id);
    if (!id) {
      console.log('AttendanceService: Attendance ID is null');
      throw new HttpException('Attendance ID cannot be null', HttpStatus.BAD_REQUEST);
    }
    if (!Types.ObjectId.isValid(id)) {
      console.log('AttendanceService: Invalid attendance ID format:', id);
      throw new BadRequestException('Invalid attendance ID format. Must be a valid MongoDB ObjectId.');
    }
    const attendance = await this.attendanceModel.findById(id).populate('member').exec();
    if (!attendance) {
      console.log('AttendanceService: Attendance not found for ID:', id);
      throw new HttpException(`Attendance not found with ID: ${id}`, HttpStatus.NOT_FOUND);
    }
    console.log('AttendanceService: Retrieved attendance:', attendance._id);
    return this.mapToDto(attendance);
  }

  async getByMemberId(memberId: string): Promise<AttendanceDto[]> {
    console.log('AttendanceService: Fetching attendance by memberId:', memberId);
    if (!memberId) {
      console.log('AttendanceService: Member ID is null');
      throw new HttpException('Member ID cannot be null', HttpStatus.BAD_REQUEST);
    }
    if (!Types.ObjectId.isValid(memberId)) {
      console.log('AttendanceService: Invalid memberId format:', memberId);
      throw new BadRequestException('Invalid memberId format. Must be a valid MongoDB ObjectId.');
    }
    await this.membersService.getById(memberId); // Validate member exists
    const attendances = await this.attendanceModel
      .find({ member: new Types.ObjectId(memberId) })
      .populate('member')
      .exec();
    console.log('AttendanceService: Retrieved', attendances.length, 'attendance records for memberId:', memberId);
    return attendances.map(attendance => this.mapToDto(attendance));
  }

  private mapToDto(attendance: Attendance): AttendanceDto {
    return {
      attendanceId: attendance.id.toString(),
      memberId: attendance.member.toString(),
      date: attendance.date.toISOString().split('T')[0],
      timeIn: attendance.timeIn.toISOString(),
      timeOut: attendance.timeOut ? attendance.timeOut.toISOString() : undefined,
    };
  }
}