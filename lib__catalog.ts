export const CATEGORIES: Record<string, string> = {
  website: 'Website (security, mobile, redesign)', booking: 'Booking or ordering', chat: 'Chat and messaging', analytics: 'Analytics and tracking',
  leads: 'Lead capture and CRM', seo: 'SEO', content: 'Content marketing', social: 'Social media',
};
export const DEFAULT_SERVICES = [
  { name: 'Website refresh', category: 'website', pitch: 'Modernise the site so it is secure, fast and mobile friendly.' },
  { name: 'Online booking or ordering flow', category: 'booking', pitch: 'Let customers book or order online without a phone call.' },
  { name: 'Chat / WhatsApp automation', category: 'chat', pitch: 'Answer common questions instantly and capture leads from chat.' },
  { name: 'Analytics and conversion tracking', category: 'analytics', pitch: 'See which pages and campaigns actually bring enquiries.' },
  { name: 'Lead capture and CRM follow-up', category: 'leads', pitch: 'Capture enquiries and follow up automatically.' },
  { name: 'SEO setup', category: 'seo', pitch: 'Help the right customers find the business on search.' },
  { name: 'Content marketing', category: 'content', pitch: 'Regular useful content that builds trust and traffic.' },
  { name: 'Social media setup', category: 'social', pitch: 'Set up and link profiles that match the brand.' },
] as const;
