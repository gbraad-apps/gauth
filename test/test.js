if ('undefined' != typeof require) {
	jsSHA = require('jssha');
	gauth = require('../js/gauth.js');
	expect = require('expect.js');
}

describe('gauth.KeyUtilities', function(){
	var keyUtils = new gauth.KeyUtilities(jsSHA),
		secret = 'JBSWY3DPEHPK3PXP',
		fixedDate = Date.UTC(1981, 1, 1) / 1000.0,
		expectedKey = '684675';

	describe('#generate()', function(){
		it('respond with known key', function(){
			expect(keyUtils.generate(secret, fixedDate)).to.be(expectedKey);
		});
	});
});
