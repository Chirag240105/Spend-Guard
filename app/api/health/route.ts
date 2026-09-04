import { NextResponse } from 'next/server';
import { runSystemDiagnosis } from '../../../src/modules/agent/diagnosis';

export async function GET() {
  const report = await runSystemDiagnosis();
  return NextResponse.json(report, { status: report.healthy ? 200 : 503 });
}
