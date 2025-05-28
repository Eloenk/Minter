import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import dotenv from 'dotenv'

dotenv.config()

puppeteer.use(StealthPlugin())

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  // Inject the custom wallet (window.ethereum)
  await page.evaluateOnNewDocument((address, signServerPort) => {
    window.ethereum = {
      isMetaMask: false,
      selectedAddress: address,
      request: async ({ method, params }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [address]

          case 'eth_chainId':
            return '0x2105' // Base network chain ID (8453 decimal)

          case 'eth_sendTransaction': {
            const tx = params[0]
            const response = await window.signTransaction(tx)
            return response.hash || response
          }

          case 'personal_sign': {
            const message = params[0]
            const response = await window.signMessage(message)
            return response.signature || response
          }

          case 'eth_sign': {
            const message = params[1]
            const response = await window.signMessage(message)
            return response.signature || response
          }

          default:
            throw new Error(`Unsupported method: ${method}`)
        }
      }
    }

    window.signTransaction = async (tx) => {
      const res = await fetch(`http://localhost:${signServerPort}/sign-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      })
      return await res.json()
    }

    window.signMessage = async (message) => {
      const res = await fetch(`http://localhost:${signServerPort}/sign-msg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      return await res.json()
    }
  }, process.env.WALLET_ADDRESS, process.env.SIGN_SERVER_PORT)

  await page.goto(process.env.NFT_MINT_URL, { waitUntil: 'networkidle0' })

  // Wait for the mint button (adjust selector if needed)
  await page.waitForSelector('button[aria-label="Mint"]', { timeout: 15000 })
  await page.click('button[aria-label="Mint"]')

  // Wait for some time to ensure transaction is processed or UI updates
  await page.waitForTimeout(60000)

  console.log('Mint attempt complete')

  await browser.close()
}

run().catch(console.error)
