
import { connectAppDatabases, startServer } from './app'

void connectAppDatabases().then(() => startServer()).catch((error) => {
  console.error('Backend startup failed:', error)
  process.exitCode = 1
})
