import express from 'express'
import cors from 'cors'
import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL))

// Sign a transaction and send it
app.post('/sign-tx', async (req, res) => {
  try {
    const tx = req.body
    const signedTx = await wallet.signTransaction(tx)
    const sentTx = await wallet.provider.sendTransaction(signedTx)
    res.json({ hash: sentTx.hash })
  } catch (e) {
    console.error('Tx signing error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Sign a message (personal_sign / eth_sign)
app.post('/sign-msg', async (req, res) => {
  try {
    const { message } = req.body
    const signature = await wallet.signMessage(message)
    res.json({ signature })
  } catch (e) {
    console.error('Message signing error:', e)
    res.status(500).json({ error: e.message })
  }
})

app.listen(process.env.SIGN_SERVER_PORT, () => {
  console.log(`Sign server running on http://localhost:${process.env.SIGN_SERVER_PORT}`)
})
