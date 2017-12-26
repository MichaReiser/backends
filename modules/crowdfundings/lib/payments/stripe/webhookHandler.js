const debug = require('debug')('crowdfundings:webhooks:stripe')
const getStripeClients = require('./clients')
const handlers = require('./webhooks/index')

module.exports = async ({ pgdb, t }) => {
  const {
    platform,
    connectedAccounts
  } = await getStripeClients(pgdb)

  const typesOfInterest = handlers.reduce(
    (arr, handler) => [...arr, ...handler.eventTypes],
    []
  )

  return async ({
    req,
    connected = false
  }) => {
    // check event
    let event
    try {
      // all events for connected accounts share the same secret
      const account = connected
        ? connectedAccounts[0]
        : platform

      event = account.stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        account.endpointSecret
      )
    } catch (e) {
      console.error(e)
      return 400
    }

    if (typesOfInterest.includes(event.type)) {
      debug('%O', event)

      const { handle } = typesOfInterest.find(handler => handler.eventTypes.includes(event.type))
      return handle(event, pgdb)
    } else {
      debug(`webhookHandler ignoring event with type: ${event.type}`)
    }
    return 200
  }
}
