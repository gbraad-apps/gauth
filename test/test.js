var jsSHA = require('jssha'),
	gauth = require('../js/gauth.js'),
	assert = require('assert');

describe('GAuth', function(){
	var keygen = new gauth.KeyUtilities(jsSHA),
		secret = 'JBSWY3DPEHPK3PXP',
		fixedDate = Date.UTC(1981, 1, 1) / 1000.0,
		expectedKey = '684675';

	describe('#generate()', function(){
		it('respond with known response', function(){
			var result = keygen.generate(secret, fixedDate);
			assert.equal(expectedKey, result);
		});
	});
});
