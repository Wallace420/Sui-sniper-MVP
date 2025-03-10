// Type declaration file for analytics services
import { SocialApiConfig } from './socialApiClient';

// Extend the SocialApiConfig interface using declaration merging
declare module './socialApiClient' {
  interface SocialApiConfig {
    apiKey?: string;
    apiEndpoint?: string;
    baseUrl?: string;
    rateLimit?: number;
  }
}