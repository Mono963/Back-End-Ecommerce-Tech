import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { CampaignType, CampaignStatus } from '../interface/newsletter.interface';

@Index(['status', 'campaignType'])
@Index(['scheduledFor'])
@Entity({ name: 'newsletter_campaigns' })
export class NewsletterCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountCode: string | null;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  featuredProductIds: string[];

  @Column({ type: 'varchar', length: 100 })
  ctaText: string;

  @Column({ type: 'varchar', length: 500 })
  ctaUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: CampaignStatus;

  @Column({ type: 'varchar', length: 20, default: 'custom' })
  campaignType: CampaignType;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ select: false })
  deletedAt: Date | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: Users;
}
