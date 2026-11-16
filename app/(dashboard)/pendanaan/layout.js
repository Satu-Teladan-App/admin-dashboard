import { DONATIONS_ENABLED } from '@/src/lib/productFeatures';
import { redirect } from 'next/navigation';

export default function FundingLayout({ children }) {
  if (!DONATIONS_ENABLED) redirect('/');
  return children;
}
