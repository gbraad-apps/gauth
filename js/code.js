// A simple authentication application written in HTML
// Copyright (C) 2012 Gerard Braad
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
function StorageService() {
	var setObject = function(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	}
	var getObject = function(key) {
		var value = localStorage.getItem(key);
		// if(value) return parsed JSON else empty array
		return value ? JSON.parse(value) : [];
	}

	var isSupported = function() {
		return typeof (Storage) !== "undefined";
	}

	// exposed functions
	return {
		isSupported: isSupported,
		getObject: getObject,
		setObject: setObject
	}
}

// Originally based on the JavaScript implementation as provided by Russell Sayers on his Tin Isles blog:
// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

function KeyUtilities() {
	var dec2hex = function(s) {
		return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
	}

	var hex2dec = function(s) {
		return parseInt(s, 16);
	}

	var base32tohex = function(base32) {
		var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
		var bits = "";
		var hex = "";

		for (var i = 0; i < base32.length; i++) {
			var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
			bits += leftpad(val.toString(2), 5, '0');
		}

		for (var i = 0; i + 4 <= bits.length; i += 4) {
			var chunk = bits.substr(i, 4);
			hex = hex + parseInt(chunk, 2).toString(16);
		}

		return hex;
	}

	var leftpad = function(str, len, pad) {
		if (len + 1 >= str.length) {
			str = Array(len + 1 - str.length).join(pad) + str;
		}
		return str;
	}

	var generate = function(secret) {
		var key = base32tohex(secret);
		var epoch = Math.round(new Date().getTime() / 1000.0);
		var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0');

		// external library for SHA functionality
		var hmacObj = new jsSHA(time, "HEX");
		var hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX");

		if (hmac != 'KEY MUST BE IN BYTE INCREMENTS') {
			var offset = hex2dec(hmac.substring(hmac.length - 1));
		}

		var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
		return (otp).substr(otp.length - 6, 6).toString();
	}

	// exposed functions
	return {
		generate: generate
	}
}

// ----------------------------------------------------------------------------

var gauthModule = angular.module('gauth', []);
gauthModule.factory('storageService', StorageService);
gauthModule.factory('keyUtilities', KeyUtilities);


function MainController($scope, storageService, keyUtilities) {
	$scope.updatingIn = '..';
	$scope.accountKeys = [];

	$scope.init = function() {
		// Check if local storage is supported
		if (storageService.isSupported()) {
			if (!storageService.getObject('accounts')) {
				$scope.addAccount('alice@google.com', 'JBSWY3DPEHPK3PXP');
			}

			$scope.updateKeys();
			// setInterval(timerTick, 1000) has to be performed with a defer or $timeout
			setInterval(function(){
				$scope.$apply(function() {
					$scope.timerTick();
				});
			}, 1000);
		} else {
			// no storage support
			// TODO: show error message
		}
	}

	$scope.timerTick = function() {
		var epoch = Math.round(new Date().getTime() / 1000.0);
		if (epoch % 30 == 0) {
			$scope.updateKeys();
		}
		// countdown
		$scope.updatingIn = 30 - (epoch % 30);
	}

	$scope.updateKeys = function() {
		$scope.accountKeys = [];

		$.each(storageService.getObject('accounts'), function (index, account) {
			var key = {
				//'index' : index,
				'name' : account.name,
				'key' : keyUtilities.generate(account.secret)
			};
			$scope.accountKeys.push(key);
		});
	}

	$scope.deleteAccount = function(index) {
		// Remove object by index
		var accounts = storageService.getObject('accounts');
		accounts.splice(index, 1);
		storageService.setObject('accounts', accounts);

		$scope.updateKeys();
	}

	$scope.addAccount = function() {
		// remove spaces from secret
		$scope.newAccount.secret.replace(/ /g, '');

		if($scope.newAccount.secret == '' && $scope.newAccount.name == '') {
			// Bailout
			$scope.resetAccount();
		} else {
			// Persist new object
			var accounts = storageService.getObject('accounts');
			accounts.push($scope.newAccount);
			storageService.setObject('accounts', accounts);

			$scope.updateKeys();
			$scope.resetAccount();
		}
	}

	// clear fields
	$scope.resetAccount = function() {
		$scope.newAccount = {};
		$.mobile.changePage('#keys');
	}

	// delayed initialize
	$(function() {
		$scope.init();
	});
}

// Main function
$(document).bind('pagecreate', function() {
	// Background styling for dialogs
	$('div[data-role="dialog"]').live('pagebeforeshow', function(e, ui) {
		ui.prevPage.addClass("ui-dialog-background");
	});

	$('div[data-role="dialog"]').live('pagehide', function(e, ui) {
		$(".ui-dialog-background ").removeClass("ui-dialog-background");
	});
});
