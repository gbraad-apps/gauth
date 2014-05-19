var window = {},
    jsSHA = require('jssha'),
    gauth = require('../js/gauth.js'),
	assert = require('assert');

describe('GAuth', function(){
	var keygen = new gauth.KeyUtilities(jsSHA),
		secret = 'JBSWY3DPEHPK3PXP',
		fixedDate = new Date("1/1/1981").getTime() / 1000.0;

	describe('#generate()', function(){
		it('respond with known response', function(){
			var result = keygen.generate(secret, fixedDate);
			assert.equal('383953', result);
		})
	})
})
