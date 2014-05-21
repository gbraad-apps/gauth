if ('undefined' != typeof require) {
	jsSHA = require('jssha');
	gauth = require('../js/gauth.js');
	expect = require('expect.js');
}

describe('gauth.KeyUtilities', function(){
	var keyUtils = new gauth.KeyUtilities(jsSHA);

	describe('#generate()', function(){
		it('respond with known key', function(){
			expect(keyUtils.generate('JBSWY3DPEHPK3PXP', Date.UTC(1981, 1, 1) / 1000.0)).to.be('684675');
		});
	});
});
