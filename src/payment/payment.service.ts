import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './payment.schema';
import { PaymentDto } from './payment.dto';
import { MembersService } from '../member/members.service';
import { NotificationsService } from '../notification/notifications.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private membersService: MembersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(paymentDto: PaymentDto): Promise<PaymentDto> {
    const { memberId, amount, validUntilDate, paymentStatus } = paymentDto;

    // Validate member exists
    const member = await this.membersService.getById(memberId);
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    // Validate validUntilDate
    const validUntil = new Date(validUntilDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (validUntil < today) {
      throw new BadRequestException('Valid until date must be today or in the future');
    }

    // Set payment date to today
    const payment = new this.paymentModel({
      member: memberId,
      amount,
      paymentDate: new Date(),
      validUntilDate: validUntil,
      paymentStatus,
    });

    const savedPayment = await payment.save();

    // Create notification
    await this.notificationsService.create({
      message: `Payment of ${amount} recorded for member ${member.name}`,
      type: 'PAYMENT_CREATED',
    });

    return this.mapToDto(savedPayment);
  }

  async findAll(): Promise<PaymentDto[]> {
    const payments = await this.paymentModel.find().populate('member').exec();
    return payments.map(this.mapToDto);
  }

  async findOne(id: string): Promise<PaymentDto> {
    if (!id || !id.match(/^[0-9a-f]{24}$/)) {
      throw new BadRequestException('Invalid payment ID');
    }
    const payment = await this.paymentModel.findById(id).populate('member').exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return this.mapToDto(payment);
  }

  async update(id: string, paymentDto: PaymentDto): Promise<PaymentDto> {
    if (!id) {
      throw new BadRequestException('Invalid payment ID');
    }

    const {paymentId, memberId, amount, paymentDate, validUntilDate, paymentStatus } = paymentDto;
    const member = await this.membersService.getById(paymentDto.memberId);

    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    // Validate validUntilDate
    const validUntil = new Date(validUntilDate);
    if (validUntil < new Date()) {
      throw new BadRequestException('Valid until date must be today or in the future');
    }

    const payment = await this.paymentModel
      .findByIdAndUpdate(
        paymentId,
        {
          member: memberId,
          amount: amount,
          paymentDate: paymentDate,
          validUntilDate: validUntilDate,
          paymentStatus: paymentStatus,
        },
        { new: true },
      )
      .populate('member')
      .exec();

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Create notification
    await this.notificationsService.create({
      message: `Payment of ${amount} updated for member ${member.name}`,
      type: 'PAYMENT_UPDATED',
    });

    return this.mapToDto(payment);
  }

  async delete(id: string): Promise<void> {
    if (!id || !id.match(/^[0-9a-f]{24}$/)) {
      throw new BadRequestException('Invalid payment ID');
    }
    const result = await this.paymentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  private mapToDto(payment: Payment): PaymentDto {
    return {
      paymentId: payment.id.toString(),
      memberId: payment.member.id.toString(),
      amount: payment.amount,
      paymentDate: payment.paymentDate.toISOString(),
      validUntilDate: payment.validUntilDate.toISOString(),
      paymentStatus: payment.paymentStatus,
    };
  }
}