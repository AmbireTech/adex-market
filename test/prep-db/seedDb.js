/* eslint-disable no-undef */
const { AdSlot, AdUnit } = require('adex-models')
const identityAddr = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258e65'

const testData = {
	campaigns: [{
		'_id': '0xceb6ab03139b98e0a22d4375ce658759b8729e21c783dea9d385d99f76527865',
		'creator': '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
		'depositAmount': '1000000000000000000',
		'depositAsset': '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
		'id': '0xceb6ab03139b98e0a22d4375ce658759b8729e21c783dea9d385d99f76527865',
		'spec': {
			'adUnits': [
				{
					'ipfs': 'QmTCnHWZQ22r43f2LqiuXHnK5EEiqHDKnxcdbg6NHaGjty',
					'type': 'legacy_300x100',
					'mediaUrl': 'ipfs://QmcHfBsBagg6BYhiLBW6qLQyCsVyd78RBAkhsVG1be6n4e',
					'mediaMime': 'image/jpeg',
					'targetUrl': 'https://hellostremio.adex.network/',
					'targeting': [
						{
							'tag': 'stremio',
							'score': 22
						}
					],
					'owner': '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
					'created': 1558351066790
				}
			],
			'validators': [
				{
					'id': '0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
					'url': 'https://itchy.adex.network',
					'fee': '0'
				},
				{
					'id': '0xce07CbB7e054514D590a0262C93070D838bFBA2e',
					'url': 'https://scratchy.adex.network',
					'fee': '0'
				}
			],
			'maxPerImpression': '1000000000000000',
			'minPerImpression': '1000000000000000',
			'targeting': [ ],
			'created': 1558351283397,
			'nonce': '73925552938438451124360388946703653167557904034069293949858925105243906956203',
			'withdrawPeriodStart': 1558437660000,
			'eventSubmission': {
				'allow': [
					{
						'uids': [
							'0x712e40a78735af344f6ae3b79fa6952d698c3b37',
							'0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
							'0xce07CbB7e054514D590a0262C93070D838bFBA2e'
						]
					},
					{
						'uids': null,
						'rateLimit': {
							'type': 'ip',
							'timeframe': 15000
						}
					}
				]
			},
			'activeFrom': 1558351262283
		},
		'validUntil': 1559042460,
		'status': {
			'name': 'Expired',
			'lastHeartbeat': {
				'leader': '2019-05-28T11:20:05.710Z',
				'follower': '2019-05-28T11:20:26.653Z'
			},
			'lastApprovedSigs': [
				'0xe1ebfc9e1918096ce2b3306f287442baf2ba6ad296b035ba8c59fd19aa095a3c7c58e8eb29737405570cedc8d7cb36a6626000a165356b6e0580bb6cde0d92201c',
				'0x95af2c6037e17dcfe1b8996d887ae09a0303412d937c91a9db52b86d529406a266ec4e4d1b46478202f10321b162953fece9f79cc12748f9c80deba936d76c1c1c'
			],
			'lastApprovedBalances': {
				'0x712e40a78735af344f6ae3b79fa6952d698c3b37': '1000000000000000000'
			},
			'verified': true,
			'lastChecked': 1562143408103,
			'fundsDistributedRatio': 1000,
			'usdEstimate': null
		}
	},
	{
		'_id': '0x242bdbb98c5d9e71e9a3954e0ff3eaf7910d87a313324b41b7c189d7821cc356',
		'creator': '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
		'depositAmount': '2000000000000000000',
		'depositAsset': '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D',
		'id': '0x242bdbb98c5d9e71e9a3954e0ff3eaf7910d87a313324b41b7c189d7821cc356',
		'spec': {
			'adUnits': [
				{
					'ipfs': 'QmTCnHWZQ22r43f2LqiuXHnK5EEiqHDKnxcdbg6NHaGjty',
					'type': 'legacy_300x100',
					'mediaUrl': 'ipfs://QmcHfBsBagg6BYhiLBW6qLQyCsVyd78RBAkhsVG1be6n4e',
					'mediaMime': 'image/jpeg',
					'targetUrl': 'https://hellostremio.adex.network/',
					'targeting': [
						{
							'tag': 'stremo',
							'score': 22
						}
					],
					'owner': '0x712e40a78735af344f6ae3b79fa6952d698c3b37',
					'created': 1558351066790
				}
			],
			'validators': [
				{
					'id': '0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
					'url': 'https://itchy.adex.network',
					'fee': '0'
				},
				{
					'id': '0xce07CbB7e054514D590a0262C93070D838bFBA2e',
					'url': 'https://scratchy.adex.network',
					'fee': '0'
				}
			],
			'maxPerImpression': '1000000000000000',
			'minPerImpression': '1000000000000000',
			'targeting': [ ],
			'created': 1558442578576,
			'nonce': '44103746893796291283255048386935160641101926828647977671381686490641359319428',
			'withdrawPeriodStart': 1558701540000,
			'eventSubmission': {
				'allow': [
					{
						'uids': [
							'0x712e40a78735af344f6ae3b79fa6952d698c3b37',
							'0x2892f6C41E0718eeeDd49D98D648C789668cA67d',
							'0xce07CbB7e054514D590a0262C93070D838bFBA2e'
						]
					},
					{
						'uids': null,
						'rateLimit': {
							'type': 'ip',
							'timeframe': 15000
						}
					}
				]
			},
			'activeFrom': 1558442346743
		},
		'validUntil': 1559306340,
		'status': {
			'name': 'Active',
			'lastHeartbeat': {
				'leader': '2019-05-31T12:38:05.226Z',
				'follower': '2019-05-31T12:38:08.087Z'
			},
			'lastApprovedSigs': [
				'0xa2db423c929f3517ade6b41badd29cbdfa375808eb9bad0b11e3f867bfdbe7110b4f0428491809c1a534234d3f86fb5d1c02eb100826b318a6a622cfcd8aea571b',
				'0x9b368d2066254cd4b3b6204446bd2bd9b45e072b812ca4ccd30deb46ae5444284a714cee788636f2cbbc8795161a66223a3e6d2eb1302cd305d7c5867ba2bf4c1b'
			],
			'lastApprovedBalances': {
				'0x712e40a78735af344f6ae3b79fa6952d698c3b37': '3000000000000000',
				'0x13ab83316c05ec84ea7c7e85bee5a4b26d812b30': '4000000000000000'
			},
			'verified': true,
			'lastChecked': 1562143408383,
			'fundsDistributedRatio': 3,
			'usdEstimate': null
		}
	}],
	validators: [
		{ _id: 'awesomeLeader', id: 'awesomeLeader', url: 'https://tom.adex.network', status: 'active', addr: '0x000000000000000078787874656e746163696f6e' },
		{ _id: 'awesomeFollower', id: 'awesomeFollower', url: 'https://jerry.adex.network', status: 'active', addr: '0x0000000000000000667265652036697839696e65' }
	],
	user: {
		identity: identityAddr,
		signerAddress: '0x2aecf52abe359820c48986046959b4136afdfbe2',
		signature: '0x71860f64f682392b891b9a32315979d48b45b32f351aa9e6719eb42bc1eddd0105fc65ab3aedc0d6a64d151427c64c6264c291ff2bbaab1aff801e32fde8fa861b',
		mode: 2,
		authToken: '7036680048500819',
		hash: '0xcd494760e8805c2a37b26b3ce02c9efe49f610dcff36efee567221ab9a3b8b16',
		typedData: [{ type: 'uint', name: 'Auth token', value: '7036680048500819' }],
		role: 'advertiser'
	},
	adUnits: [
		new AdUnit({
			type: 'legacy_250x250',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'games', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
			owner: identityAddr
		}),
		new AdUnit({
			type: 'legacy_160x600',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'movies', score: 42 }, { tag: 'usa', score: 60 }],
			owner: identityAddr
		}),
		new AdUnit({
			type: 'legacy_728x90',
			mediaUrl: 'ipfs://QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
			mediaMime: 'image/jpeg',
			targetUrl: 'https://google.com',
			targeting: [{ tag: 'music', score: 100 }],
			created: Date.now(),
			title: 'Test ad unit',
			description: 'test ad unit for seeding db',
			tags: [{ tag: 'music', score: 42 }, { tag: 'rap', score: 60 }],
			owner: identityAddr,
			archived: true
		})
	],
	adSlot: new AdSlot({
		type: 'legacy_250x250',
		tags: [{ tag: 'games', score: 42 }, { tag: 'usa', score: 60 }],
		owner: identityAddr,
		created: Date.now(),
		fallbackUnit: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		ipfs: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
		title: 'Test slot 1',
		description: 'Test slot for running integration tests',
		archived: false,
		modified: Date.now()
	})
}

function seedDb (db) {
	return Promise.all([
		db.collection('campaigns').insertMany(testData.campaigns),
		db.collection('validators').insertMany(testData.validators),
		db.collection('users').insertOne(testData.user),
		db.collection('adUnits').insertMany(testData.adUnits),
		db.collection('adSlots').insertOne(testData.adSlot)
	])
}

module.exports = { testData, seedDb }
