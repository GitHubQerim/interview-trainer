import Fastify from 'fastify'
import { registerFragenRoute } from './routes/fragen.js'
import { registerVerlaufRoute } from './routes/verlauf.js'

const app = Fastify({ logger: true })

await app.register(registerFragenRoute)
await app.register(registerVerlaufRoute)

const PORT = 3001

app.listen({ port: PORT }, (error) => {
  if (error) {
    app.log.error(error)
    process.exit(1)
  }
})
