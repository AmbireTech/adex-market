const categorizeAdSlot = require('./categorizeAdSlot')

const mockAdSlot = {
	type: 'legacy_250x250',
	created: Date.now(),
	fallbackUnit: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
	title: 'Test slot 1',
	description: 'Test slot for running integration tests',
	archived: false,
	modified: Date.now(),
	website: 'https://github.com',
	minPerImpression: { balance: '100' },
}

async function run() {
	const tags = await categorizeAdSlot(mockAdSlot)
	return tags
}

run()
