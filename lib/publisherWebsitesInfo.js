const url = require('url')
const { validQuery } = require('../lib/publisherVerification')

function getRecommendedEarningLimitUSD(website) {
	if (!(website && website.rank)) return 100
	if (website.rank < 10000) return 10000
	else if (website.rank < 100000) return 5000
	else if (website.rank < 300000) return 1000
	else return 100
}

function getCategories(website) {
	if (!website) return []
	const startCategories = website.webshrinkerCategories || []
	const overrides = website.webshrinkerCategoriesOverrides || {}
	// NOTE: Consider: if it's personal finance and shady (low rank, non reputable TLD), consider it incentivized
	// NOTE: Consider: if it's high ranking, reputable TLD, and has other categories, do not look at overrides.incentivized
	const categories = startCategories
		.concat(overrides.incentivized ? ['IAB25-7'] : [])
		.concat(overrides.add || [])
	const toRemove = overrides.remove || []
	return categories
		.filter(cat => !toRemove.includes(cat))
		.filter((cat, i, all) => all.indexOf(cat) === i)
}

// If the hostname does not start with www., return a www. hostname
// and vice versa
function getOppositeWww(hostname) {
	const split = hostname.split('.')
	if (split.length === 3 && split[0] === 'www')
		return [`https://${split[1]}.${split[2]}`]
	if (split.length === 2) return [`https://www.${split[0]}.${split[1]}`]
	return []
}

// regarding acceptedReferrers, returning `null` means "everything", returning an empty array means "nothing"
async function getWebsitesInfo(websitesCol, slot) {
	if (slot.website) {
		// website is set: check if there is a verification
		const { hostname } = url.parse(slot.website)
		// A single website may have been verified by multiple publishers; in this case, we allow the earliest
		// valid verification: this is why we get the first record and check whether publisher == owner
		const website = await websitesCol.findOne({ hostname, ...validQuery })
		const hasActiveValidWebsite = website && website.publisher === slot.owner
		// @XXX: .extraReferrers is only permitted in the new mode (if .website is set)
		const acceptedReferrers = hasActiveValidWebsite
			? [`https://${hostname}`]
					.concat(getOppositeWww(hostname))
					.concat(
						Array.isArray(website.extraReferrers) ? website.extraReferrers : []
					)
			: []
		const recommendedEarningLimitUSD = getRecommendedEarningLimitUSD(website)
		const categories = getCategories(website)
		return { acceptedReferrers, recommendedEarningLimitUSD, categories }
	} else {
		// @TODO: remove this; this is the legacy way of doing things; ad slots w/o websites should not be permitted at all
		// A single website may have been verified by multiple publishers
		const websites = await websitesCol
			.find({ publisher: slot.owner, ...validQuery })
			.toArray()
		const websitesDupes = await websitesCol
			.find({
				hostname: { $in: websites.map(x => x.hostname) },
				publisher: { $ne: slot.owner },
				...validQuery,
			})
			.toArray()
		const websitesWithNoDupes = websites.filter(
			x => !websitesDupes.find(y => x.hostname === y.hostname && y._id < x._id)
		)
		const acceptedReferrers = websitesWithNoDupes.map(
			x => `https://${x.hostname}`
		)
		// This case doesn't support recommendedEarningLimitUSD: that's intentional,
		// as it's only used by old publishers who were strictly verified
		return {
			acceptedReferrers,
			recommendedEarningLimitUSD: null,
			categories: [],
		}
	}
}

module.exports = { getWebsitesInfo }