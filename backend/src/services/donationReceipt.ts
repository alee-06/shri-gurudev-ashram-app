import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

const receiptDir = path.join(process.cwd(), 'backend', 'receipts')

export async function generateReceipt(donation: any) {
  await fs.promises.mkdir(receiptDir, { recursive: true })
  const filePath = path.join(receiptDir, `receipt_${donation._id}.pdf`)
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const stream = fs.createWriteStream(filePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)
    doc.fontSize(20).text('Shri Gurudev Ashram', { align: 'center' })
    doc.moveDown().fontSize(14).text('Donation Receipt', { align: 'center' })
    doc.moveDown().fontSize(11)
    doc.text(`Receipt No.: ${donation.receiptNumber ?? 'N/A'}`)
    doc.text(`Donor: ${donation.donor?.anonymousDisplay ? 'Anonymous Donor' : donation.donor?.name ?? '-'}`)
    doc.text(`Mobile: ${donation.donor?.mobile ?? '-'}`)
    doc.text(`Cause: ${donation.donationHead?.name ?? '-'}`)
    doc.text(`Amount: INR ${donation.amount}`)
    doc.text(`Payment: ${donation.paymentMethod ?? 'ONLINE'}`)
    doc.text(`Transaction ID: ${donation.paymentId ?? donation.transactionRef ?? 'N/A'}`)
    doc.moveDown().text('Thank you for your generous contribution.')
    doc.end()
  })
  return filePath
}

export function publicReceiptUrl(filePath: string) {
  return `/receipts/${path.basename(filePath)}`
}
