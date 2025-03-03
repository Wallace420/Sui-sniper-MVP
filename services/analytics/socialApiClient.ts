import axios from 'axios';

export interface SocialApiConfig {
  twitterApiKey?: string;
  telegramApiKey?: string;
  discordApiKey?: string;
  redditApiKey?: string;
}

export interface SocialMentionData {
  platform: string;
  count: number;
  sentiment: number;
  timestamp: number;
}

export interface SocialApiResponse {
  mentions: SocialMentionData[];
  totalMentions: number;
  averageSentiment: number;
}

export class SocialApiClient {
  private config: SocialApiConfig;
  private baseUrl: string = 'https://api.socialanalytics.io/v1';

  constructor(config: SocialApiConfig) {
    this.config = config;
  }

  async fetchSocialData(query: string, platforms: string[] = ['twitter', 'telegram', 'discord', 'reddit'], days: number = 7): Promise<SocialApiResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/mentions`, {
        params: {
          query,
          platforms: platforms.join(','),
          days
        },
        headers: {
          'Authorization': `Bearer ${this.config.twitterApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching social data:', error);
      throw new Error(`Failed to fetch social data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fetchCommunityMetrics(projectName: string, platforms: string[] = ['twitter', 'telegram', 'discord', 'reddit']): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/community`, {
        params: {
          project: projectName,
          platforms: platforms.join(',')
        },
        headers: {
          'Authorization': `Bearer ${this.config.twitterApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching community metrics:', error);
      throw new Error(`Failed to fetch community metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
