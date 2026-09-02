import { NextResponse } from 'next/server'
import { getSuppliers } from '@/lib/demo-data'

export async function GET() {
  return NextResponse.json(getSuppliers())
}
