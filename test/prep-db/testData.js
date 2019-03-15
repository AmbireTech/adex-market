/* eslint-disable no-undef */
const campaigns = [{
	_id: 'testCampaign1',
	id: 'testCampaign1',
	status: 'live',
	depositAsset: 'DAI',
	depositAmount: 1000,
	validators: ['awesomeLeader', 'awesomeFollower'],
	spec: {
		validators: [
			{ id: 'awesomeLeader', url: 'http://localhost:8005', fee: 100 },
			{ id: 'awesomeFollower', url: 'http://localhost:8006', fee: 100 }
		]
	}
}]

const validators = [
	{ _id: 'awesomeLeader', id: 'awesomeLeader', url: 'http://localhost:8005', status: 'active', addr: '0x000000000000000078787874656e746163696f6e' },
	{ _id: 'awesomeFollower', id: 'awesomeFollower', url: 'http://localhost:8006', status: 'active', addr: '0x0000000000000000667265652036697839696e65' }
]

const users = [{
	identity: '0xa624dEe05d96A0b3E441d0ee3b25Cc5CC0b5b836',
	address: '0x2aecf52abe359820c48986046959b4136afdfbe2',
	signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
	mode: '1',
	authToken: '7036680048500819',
	hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
	typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }],
	role: 'advertiser'
}]

const adUnits = [
	{
		type: 'legacy_250x250',
		mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		targetUrl: 'https://google.com',
		tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
		owner: '0x000000000000000078787874656e746163696f6e'
	},
	{
		type: 'legacy_160x600',
		mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb23',
		targetUrl: 'https://google.com',
		tags: [{ tag: 'movies', score: 90 }, { tag: 'captain-marvel', score: 0 }],
		owner: '0x000000000000000078787874656e746163696f6e'
	},
	{
		type: 'legacy_728x90',
		mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb24',
		targetUrl: 'https://google.com',
		tags: [{ tag: 'music', score: 70 }, { tag: 'rap', score: 100 }],
		owner: '0x000000000000000078787874656e746163696f6e'
	}
]

const adSlots = [
	{
		type: 'legacy_250x250',
		fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		fallbackTargetUrl: 'https://google.com',
		tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
		owner: '0x78787874656e746163696f6e0000000000000000'
	}
]

if (typeof (module) !== 'undefined') module.exports = { campaigns, validators, users, adUnits, adSlots }
if (typeof (db) !== 'undefined') {
	db.campaigns.insert(campaigns)
	db.validators.insert(validators)
	db.users.insert(users)
	db.adUnits.insert(adUnits)
	db.adSlots.insert(adSlots)
}
