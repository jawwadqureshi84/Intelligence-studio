import './globals.css';
import Shell from './shell';
export const metadata = { title: 'Prospect Intelligence Studio', description: 'Research prospects, score them and draft outreach.' };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Shell />{children}</body></html>;
}
