const logger = console

module.exports = async (args, {user, pgdb, req, t}) => {
  const {firstName, lastName, birthday, address, phoneNumber} = args
  const transaction = await pgdb.transactionBegin()
  try {
    if (firstName || lastName || birthday || phoneNumber) {
      await transaction.public.users.update({id: user.id}, {
        firstName,
        lastName,
        birthday,
        phoneNumber
      }, {skipUndefined: true})
    }
    if (address) {
      if (user.addressId) { // update address of user
        await transaction.public.addresses.update({id: user.addressId}, address)
      } else { // user has no address yet
        const userAddress = await transaction.public.addresses.insertAndGet(address)
        await transaction.public.users.update({id: user.id}, {addressId: userAddress.id})
      }
    }
    await transaction.transactionCommit()
    return pgdb.public.users.findOne({id: user.id})
  } catch (e) {
    await transaction.transactionRollback()
    logger.error('error in transaction', { req: req._log(), args, error: e })
    throw new Error(t('api/unexpected'))
  }
}
