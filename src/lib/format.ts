export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number, decimals = 1): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function getStockColor(status: string): string {
  switch (status) {
    case 'critical':
      return 'text-red-400'
    case 'warning':
      return 'text-amber-400'
    default:
      return 'text-emerald-400'
  }
}

export function getStockBgColor(status: string): string {
  switch (status) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'warning':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    default:
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'critical':
      return 'Kritis'
    case 'warning':
      return 'Peringatan'
    default:
      return 'Aman'
  }
}

export function getPoStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Disetujui'
    case 'draft':
      return 'Menunggu'
    case 'rejected':
      return 'Ditolak'
    case 'delivered':
      return 'Diterima'
    default:
      return status
  }
}

export function getPoStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'draft':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'rejected':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'delivered':
      return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}
