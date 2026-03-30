export interface Customer {
  id: string;
  companyId: string;
  externalId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  channelIdentifiers: Record<string, string>;
  profileData: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
