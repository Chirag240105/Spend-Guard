'use client';
import { PageState } from '@/src/components/page-state';
export default function Error() {
  return <PageState error message="Something went wrong while loading this page." />;
}
