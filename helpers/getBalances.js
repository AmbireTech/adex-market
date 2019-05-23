const getRequest = require('./getRequest')

async function getBalances (validatorUrl, channelId) {
	return getRequest(`${validatorUrl}/channel/${channelId}/last-approved`)
		.catch((err) => {
			return err
		})
}

module.exports = getBalances
