import { Injectable, Inject } from '@nestjs/common';
import {
  RegisterPgTableChangeListener,
  PgTableChangeListener,
  PgTableChanges,
  PgTableChangeErrorHandler,
} from '@cisstech/nestjs-pg-pubsub';
import { AttendanceScan } from './attendance-scan.entity';
import { AttendanceService } from './attendance.service';

@Injectable()
@RegisterPgTableChangeListener(AttendanceScan)  // Registers listener for this entity
export class AttendanceScanListener implements PgTableChangeListener<AttendanceScan> {
  constructor(
    private readonly attendanceService: AttendanceService,  // Inject your existing service
    //private readonly attendanceController: AttendanceController
  ) {}

  async process(
    changes: PgTableChanges<AttendanceScan>,
    onError?: PgTableChangeErrorHandler,
  ): Promise<void> {
    try {
      // Handle INSERT events (new scan data inserted into PG table)
      changes.INSERT.forEach(async (insert) => {
        const nicNumber = insert.data.employeeid;
        console.log(`New attendance scan detected for nicNumber: ${nicNumber}`);

        // Trigger your existing MongoDB-based attendance marking
        let attendanceDto = await this.attendanceService.createOrUpdateAttendance(nicNumber);
        console.log("Attendance Service Return Data", attendanceDto);


      });

      // Optionally handle UPDATE or DELETE if needed in the future
      // changes.UPDATE.forEach(...);
      // changes.DELETE.forEach(...);
    } catch (error) {
      console.error('Error processing attendance scan:', error);
      if (onError) {
        onError(changes.all.map(change => change.id));  // Queue for retry
      }
      throw error;
    }
  }
}