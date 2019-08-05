const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const db = require('../db')

async function retrieveChannelsFromDb () {
	const validatorsCol = db.getMongo().collection('validators')
	return validatorsCol.find({})
		.toArray()
		.catch((err) => console.error('error getting validators', err))
}

async function getUniqueChannels (channelsObj) {
	const channels = channelsObj.reduce((cns, c) => {
		return cns.concat(c.channels)
	}, [])
	const uniqueChannels = channels.filter((c, i, cns) => {
		return cns.map(cn => cn['id']).indexOf(c['id']) === i
	})
	return uniqueChannels
}

async function getChannels () {
	const validators = await retrieveChannelsFromDb()
	const allChannels = await Promise.all(validators.map((v) => getRequest(`${v.url}/channel/list`)))
	const channels = await getUniqueChannels(allChannels)
	// Ensuring it would work if we change total to totalPages
	// NOTE: Should be fixed
	if (channels.totalPages && channels.totalPages > 1) {
		const pageCount = channels.total || channels.totalPages
		const allChannels = await getAllPages(channels, pageCount)
		return allChannels
	}
	return channels
}

async function getAllPages (channelsFirstPage, total) {
	const allRequests = []
	for (let page = 1; page < total; page++) {
		allRequests.push(getRequest(`${cfg.initialValidators[0]}/channel/list?page=${page}`))
	}

	const allChannels = await Promise.all(allRequests).then((res) => {
		return res.reduce((channels, c) => {
			return channels.concat(c.channels)
		}, channelsFirstPage)
	})
	return allChannels
}

module.exports = getChannels
