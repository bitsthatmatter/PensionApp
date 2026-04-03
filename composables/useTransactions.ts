import { read, utils } from 'xlsx'

export interface Transaction {
  accountNumber: string
  currency: string
  transactionDate: string
  valueDate: string
  openingBalance: number
  closingBalance: number
  amount: number
  description: string
}

/**
 * Maps a raw SheetJS row to a typed Transaction object.
 * - Dates are converted from YYYYMMDD to ISO format (YYYY-MM-DD)
 * - Excess whitespace in the description field is collapsed to a single space
 */
function mapRow(row: Record<string, unknown>): Transaction {
  const toIsoDate = (value: unknown): string => {
    const s = String(value ?? '').trim()
    if (/^\d{8}$/.test(s)) {
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    }
    return s
  }

  return {
    accountNumber:   String(row['Rekeningnummer'] ?? '').trim(),
    currency:        String(row['Muntsoort'] ?? '').trim(),
    transactionDate: toIsoDate(row['Transactiedatum']),
    valueDate:       toIsoDate(row['Rentedatum']),
    openingBalance:  Number(row['Beginsaldo']),
    closingBalance:  Number(row['Eindsaldo']),
    amount:          Number(row['Transactiebedrag']),
    description:     String(row['Omschrijving'] ?? '').replace(/\s+/g, ' ').trim(),
  }
}

/**
 * Composable that processes an uploaded XLS/XLSX file and returns
 * an array of Transaction objects.
 *
 * Usage:
 *   const { parseFile, transactions, error, isLoading } = useTransactions()
 *   await parseFile(event.target.files[0])
 */
export function useTransactions() {
  const transactions = useState<Transaction[]>('transactions', () => [])
  const error = useState<string | null>('transactions-error', () => null)
  const isLoading = useState<boolean>('transactions-loading', () => false)

  async function parseFile(file: File): Promise<void> {
    error.value = null
    isLoading.value = true

    try {
      if (!file) throw new Error('No file provided.')

      const buffer = await file.arrayBuffer()
      const workbook = read(buffer)

      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) throw new Error('The file contains no worksheets.')

      const sheet = workbook.Sheets[firstSheet]
      const rows = utils.sheet_to_json<Record<string, unknown>>(sheet)

      transactions.value = rows.map(mapRow)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'An unknown error occurred.'
      transactions.value = []
    } finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    transactions.value = []
    error.value = null
    isLoading.value = false
  }

  return { parseFile, transactions, error, isLoading, reset }
}
