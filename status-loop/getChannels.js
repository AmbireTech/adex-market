const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')

async function getChannels () {
	// const lists = хawait Promise.all(cfg.initialValidators.map(url => getRequest(`${url}/channel/list`)))
	let { channels } = await getRequest(`${cfg.initialValidators[0]}/channel/list`)
	// Ensuring it would work if we change total to totalPages
	if ((channels.total && channels.total > 1) || (channels.totalPages && channels.totalPages > 1)) {
		const pageCount = channels.total || channels.totalPages
		const allChannels = await getAllPages(channels, pageCount)
		return allChannels
	}
	return channels
}

async function getAllPages (channelsObj, total) {
	const allRequests = []
	for (let page = 1; page < total; page++) {
		allRequests.push(await getRequest(`${cfg.initialValidators[0]}/channel/list?page=${page}`))
	}
	const allChannelObjects = await Promise.all(allRequests)
	const allChannels = [channelsObj.channels, allChannelObjects.map((c) => c.channels)].flat()
	return allChannels
}

module.exports = getChannels
