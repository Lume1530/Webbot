export const validateInstagramUrl = (url: string): boolean => {
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/reel\/([A-Za-z0-9_-]+)\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)\/?/,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/([A-Za-z0-9_-]+)\/?/
  ];
  
  return patterns.some(pattern => pattern.test(url));
};

export const extractShortcode = (url: string): string | null => {
  const patterns = [
    /\/reel\/([A-Za-z0-9_-]+)/,
    /\/p\/([A-Za-z0-9_-]+)/,
    /\/tv\/([A-Za-z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export const generateThumbnail = (shortcode: string): string => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const color = colors[shortcode.length % colors.length];
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="300" fill="${color}"/>
      <text x="150" y="150" text-anchor="middle" dy=".35em" fill="white" font-size="24" font-family="Arial">
        ${shortcode.slice(0, 3).toUpperCase()}
      </text>
    </svg>
  `)}`;
};

export const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

export const calculatePayout = (views: number): number => {
  return (views / 1000) * 0.025;
};