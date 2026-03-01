import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NewsletterSubscriber } from './newsletter-subscriber.entity';
import { CampaignType, TrackingStatus } from '../interface/newsletter.interface';

@Entity({ name: 'newsletter_tracking' })
export class NewsletterTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  campaignType: CampaignType;

  @Column({ type: 'uuid', name: 'subscriber_id' })
  @Index()
  subscriberId: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: TrackingStatus;

  @CreateDateColumn({ name: 'queued_at' })
  queuedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'opened_at' })
  openedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'clicked_at' })
  clickedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @ManyToOne(() => NewsletterSubscriber, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: NewsletterSubscriber;
}
