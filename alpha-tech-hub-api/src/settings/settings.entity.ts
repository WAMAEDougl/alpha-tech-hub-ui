import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Alpha Computers Nanyuki' })
  companyName: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  locationLng: number;

  @Column({ nullable: true })
  address: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
