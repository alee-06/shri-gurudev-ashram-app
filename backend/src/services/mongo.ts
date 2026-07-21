import mongoose from 'mongoose'

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const mainDb = mongoose.createConnection()
export const sharedDb = mongoose.createConnection()

let connected = false

export async function connectDonationDatabases() {
  if (connected) return
  await Promise.all([
    mainDb.openUri(required('MONGO_URI'), { serverSelectionTimeoutMS: 5000 }),
    sharedDb.openUri(required('MONGO_URI_SHARED'), { serverSelectionTimeoutMS: 5000 }),
  ])
  connected = true
}

export async function closeDonationDatabases() {
  await Promise.all([mainDb.close(), sharedDb.close()])
  connected = false
}
