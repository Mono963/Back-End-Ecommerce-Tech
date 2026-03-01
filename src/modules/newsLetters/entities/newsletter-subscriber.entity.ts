import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'newsletter_subscribers' })
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  unsubscribeToken: string;

  @CreateDateColumn({ name: 'subscribed_at' })
  subscribedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'unsubscribed_at' })
  unsubscribedAt: Date | null;
}
