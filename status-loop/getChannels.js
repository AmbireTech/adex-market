const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')

async function getChannels () {
	// const lists = хawait Promise.all(cfg.initialValidators.map(url => getRequest(`${url}/channel/list`)))
	let { channels } = await getRequest(`${cfg.initialValidators[0]}/channel/list`)
	// Ensuring it would work if we change total to totalPages
	// NOTE: Should be fixed
	if ((channels.total && channels.total > 1) || (channels.totalPages && channels.totalPages > 1)) {
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
