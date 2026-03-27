import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

export enum RepairStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSTIC = 'DIAGNOSTIC',
  AWAITING_PARTS = 'AWAITING_PARTS',
  IN_REPAIR = 'IN_REPAIR',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('repair_tickets')
export class RepairTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ticketNumber: string; // e.g. SVC-0001

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ nullable: true })
  userId: string;

  // Customer info (for walk-ins without accounts)
  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column()
  deviceBrand: string;

  @Column({ nullable: true })
  deviceModel: string;

  @Column({ type: 'text' })
  issueDescription: string;

  @Column({ type: 'enum', enum: RepairStatus, default: RepairStatus.RECEIVED })
  status: RepairStatus;

  @Column({ nullable: true })
  technician: string;

  @Column({ type: 'text', nullable: true })
  technicianNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalCost: number;

  @Column({ nullable: true })
  serviceType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
