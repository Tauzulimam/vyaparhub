import React from 'react';
import { mockStores } from '@/data/mockData';
import StoreDetailClient from './StoreDetailClient';

interface StoreDetailPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return mockStores.map((store) => ({
    id: store.id,
  }));
}

export default async function StoreDetailPage({ params }: StoreDetailPageProps) {
  const { id } = await params;
  return <StoreDetailClient storeId={id} />;
}
