'use client';

import { Sidebar } from '@/components/Sidebar';
import { ResourceCRUD } from '@/components/ResourceCRUD';

export default function StoragePage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <section className="ml-20 flex flex-1 flex-col gap-6 px-6 py-6 md:ml-24 lg:ml-28 overflow-y-auto">
        <ResourceCRUD title="Object Storage" resourceType="Storage Bucket" />
      </section>
    </div>
  );
}

