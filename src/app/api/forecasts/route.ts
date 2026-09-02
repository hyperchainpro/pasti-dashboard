import { NextResponse } from 'next/server'
import { getForecasts } from '@/lib/demo-data'

export async function GET() {
  return NextResponse.json(getForecasts())
}