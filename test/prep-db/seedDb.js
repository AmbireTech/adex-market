/* eslint-disable no-undef */
const testData = {
	campaign: {
		_id: 'testCampaign1',
		id: 'testCampaign1',
		status: 'Active',
		depositAsset: 'DAI',
		depositAmount: 1000,
		validators: ['awesomeLeader', 'awesomeFollower'],
		spec: {
			validators: [
				{ id: 'awesomeLeader', url: 'http://localhost:8005', fee: 100 },
				{ id: 'awesomeFollower', url: 'http://localhost:8006', fee: 100 }
			]
		}
	},
	validators: [
		{ _id: 'awesomeLeader', id: 'awesomeLeader', url: 'http://localhost:8005', status: 'active', addr: '0x000000000000000078787874656e746163696f6e' },
		{ _id: 'awesomeFollower', id: 'awesomeFollower', url: 'http://localhost:8006', status: 'active', addr: '0x0000000000000000667265652036697839696e65' }
	],
	user: {
		identity: '0x27e47D714fe59a13C008341Fc83588876b747c60',
		address: '0x2aecf52abe359820c48986046959b4136afdfbe2',
		signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
		mode: 1,
		authToken: '7036680048500819',
		hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
		typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }],
		role: 'advertiser'
	},
	adUnits: [
		{
			type: 'legacy_250x250',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			targetUrl: 'https://google.com',
			tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
			owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
		},
		{
			type: 'legacy_160x600',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb23',
			targetUrl: 'https://google.com',
			tags: [{ tag: 'movies', score: 90 }, { tag: 'captain-marvel', score: 0 }],
			owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
		},
		{
			type: 'legacy_728x90',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb24',
			targetUrl: 'https://google.com',
			tags: [{ tag: 'music', score: 70 }, { tag: 'rap', score: 100 }],
			owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
		}
	],
	adSlot: {
		type: 'legacy_250x250',
		fallbackMediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		fallbackTargetUrl: 'https://google.com',
		tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
		owner: '0x27e47D714fe59a13C008341Fc83588876b747c60'
	}
}

function seedDb (db) {
	return Promise.all([
		db.collection('campaigns').insertOne(testData.campaign),
		db.collection('validators').insertMany(testData.validators),
		db.collection('users').insertOne(testData.user),
		db.collection('adUnits').insertMany(testData.adUnits),
		db.collection('adSlots').insertOne(testData.adSlot)
	])
}

module.exports = { testData, seedDb }