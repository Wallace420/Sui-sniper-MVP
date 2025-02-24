import { CoinMetadata } from '@mysten/sui/client';

export interface TokenLinks {
    dexScreener?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
}

export class LinkManager {
    private static readonly DEX_SCREENER_BASE = 'https://dexscreener.com/sui';

    static getTokenLinks(metadata: CoinMetadata | null, poolId: string): TokenLinks {
        const links: TokenLinks = {};

        try {
            // Add DEX Screener link
            links.dexScreener = `${this.DEX_SCREENER_BASE}/${poolId}`;

            if (metadata) {
                // Extract social links from metadata
                const websiteUrl = this.sanitizeUrl(metadata?.description);
                if (websiteUrl) links.website = websiteUrl;

                // Parse additional social links if they exist in description
                if (metadata.description) {
                    const socialLinks = this.extractSocialLinks(metadata.description);
                    Object.assign(links, socialLinks);
                }
            }

            return links;
        } catch (error) {
            console.error('Error getting token links:', error);
            return links;
        }
    }

    private static sanitizeUrl(url: string | null | undefined): string | undefined {
        if (!url) return undefined;
        try {
            const sanitized = new URL(url);
            return sanitized.toString();
        } catch {
            return undefined;
        }
    }

    private static extractSocialLinks(description: string): Partial<TokenLinks> {
        const links: Partial<TokenLinks> = {};
        const patterns = {
            twitter: /(?:twitter\.com|x\.com)\/([\w\d_]+)/i,
            telegram: /t\.me\/([\w\d_]+)/i,
            discord: /discord\.(?:gg|com)\/([\w\d-]+)/i
        };

        try {
            // Extract social links from description
            for (const [platform, pattern] of Object.entries(patterns)) {
                const match = description.match(pattern);
                if (match) {
                    links[platform as keyof TokenLinks] = match[0].startsWith('http') 
                        ? match[0] 
                        : `https://${match[0]}`;
                }
            }
        } catch (error) {
            console.error('Error extracting social links:', error);
        }

        return links;
    }
}