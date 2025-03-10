"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkManager = void 0;
var LinkManager = /** @class */ (function () {
    function LinkManager() {
    }
    LinkManager.getTokenLinks = function (metadata, poolId) {
        var links = {};
        try {
            // Add DEX Screener link
            links.dexScreener = "".concat(this.DEX_SCREENER_BASE, "/").concat(poolId);
            if (metadata) {
                // Extract social links from metadata
                var websiteUrl = this.sanitizeUrl(metadata === null || metadata === void 0 ? void 0 : metadata.description);
                if (websiteUrl)
                    links.website = websiteUrl;
                // Parse additional social links if they exist in description
                if (metadata.description) {
                    var socialLinks = this.extractSocialLinks(metadata.description);
                    Object.assign(links, socialLinks);
                }
            }
            return links;
        }
        catch (error) {
            console.error('Error getting token links:', error);
            return links;
        }
    };
    LinkManager.sanitizeUrl = function (url) {
        if (!url)
            return undefined;
        try {
            var sanitized = new URL(url);
            return sanitized.toString();
        }
        catch (_a) {
            return undefined;
        }
    };
    LinkManager.extractSocialLinks = function (description) {
        var links = {};
        var patterns = {
            twitter: /(?:twitter\.com|x\.com)\/([\w\d_]+)/i,
            telegram: /t\.me\/([\w\d_]+)/i,
            discord: /discord\.(?:gg|com)\/([\w\d-]+)/i
        };
        try {
            // Extract social links from description
            for (var _i = 0, _a = Object.entries(patterns); _i < _a.length; _i++) {
                var _b = _a[_i], platform = _b[0], pattern = _b[1];
                var match = description.match(pattern);
                if (match) {
                    links[platform] = match[0].startsWith('http')
                        ? match[0]
                        : "https://".concat(match[0]);
                }
            }
        }
        catch (error) {
            console.error('Error extracting social links:', error);
        }
        return links;
    };
    LinkManager.DEX_SCREENER_BASE = 'https://dexscreener.com/sui';
    return LinkManager;
}());
exports.LinkManager = LinkManager;
