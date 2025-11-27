import { NextResponse } from 'next/server';

import { dashboardResponseSchema, mockDashboardResponse } from '@/lib/mocks';

export async function GET() {
  const parsed = dashboardResponseSchema.parse(mockDashboardResponse);
  return NextResponse.json(parsed, { status: 200 });
}
