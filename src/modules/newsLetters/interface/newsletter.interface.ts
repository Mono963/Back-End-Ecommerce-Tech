export type CampaignType = 'welcome' | 'monthly' | 'promo' | 'custom';
export type CampaignStatus = 'draft' | 'active' | 'archived';
export type TrackingStatus = 'queued' | 'sent' | 'failed' | 'opened' | 'clicked';

export interface ICreateCampaign {
  name: string;
  subject: string;
  title: string;
  body: string;

  discountCode?: string;
  featuredProductIds?: string[];

  ctaText: string;
  ctaUrl: string;

  status?: CampaignStatus;
  campaignType?: CampaignType;

  scheduledFor?: string;
}

export type IUpdateCampaign = Partial<ICreateCampaign>;

export interface INewsletterJobData {
  type: CampaignType;
  subscriberId: string;
  email: string;
  subscriberName: string | null;
  unsubscribeToken: string;
  trackingId: string;
  promoData?: {
    title: string;
    description: string;
    discountCode?: string;
  };
  campaignData?: {
    subject: string;
    title: string;
    body: string;
    discountCode?: string;
    ctaText: string;
    ctaUrl: string;
    featuredProducts: Array<{
      id: string;
      name: string;
      basePrice: number;
      imgUrls: string[];
      category?: { id: string; category_name: string };
    }>;
  };
}
