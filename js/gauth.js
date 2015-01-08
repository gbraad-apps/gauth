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

(function(exports) {
	"use strict";
    var lastUpdate;

    var StorageService = function() {

        var setObject = function(key, value, callback) {
            if (this.storageType() === "chrome") {
                var valueObj = {};
                valueObj[key] = value;
                chrome.storage.sync.set(valueObj, function() {
                    callback();
                });
            }
            else if (this.storageType() === "localStorage") {
                localStorage.setItem(key, JSON.stringify(value));
                callback();
            }
            else {
                throw new Error("Invalid storage type");
            }
        };

        var getObject = function(key, callback) {
            if (this.storageType() === "chrome") {
                chrome.storage.sync.get(key, function(result) {
                    callback(result);
                });
            }
            else if (this.storageType() === "localStorage", callback) {
                var obj = JSON.parse(localStorage.getItem(key));
                if (obj != null) {
                    var result = {};
                    result[key] = JSON.parse(localStorage.getItem(key));
                }
                else {
                    result = obj;
                }
                callback(result);
            }
            else {
                throw new Error("Invalid storage type");
            }
        };

        var isSupported = function() {
            return (typeof (Storage) !== "undefined"
                || typeof (chrome.storage) !== "undefined");
        };

        var storageType = function() {
//             return "localStorage";
            if (typeof (chrome.storage) !== "undefined") {
                return "chrome";
            }
            else if (typeof (Storage) !== "undefined") {
                return "localStorage";
            }
            else {
                return null;
            }
        };

        // exposed functions
        return {
            isSupported: isSupported,
            getObject: getObject,
            setObject: setObject,
            storageType: storageType
        };
    };

    exports.StorageService = StorageService;

	// Originally based on the JavaScript implementation as provided by Russell Sayers on his Tin Isles blog:
	// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

	var KeyUtilities = function(jsSHA) {

		var dec2hex = function(s) {
			return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
		};

		var hex2dec = function(s) {
			return parseInt(s, 16);
		};

		var base32tohex = function(base32) {
			var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
			var bits = "";
			var hex = "";

			for (var i = 0; i < base32.length; i++) {
				var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
				bits += leftpad(val.toString(2), 5, '0');
			}

			for (i = 0; i + 4 <= bits.length; i += 4) {
				var chunk = bits.substr(i, 4);
				hex = hex + parseInt(chunk, 2).toString(16);
			}

			return hex;
		};

		var leftpad = function(str, len, pad) {
			if (len + 1 >= str.length) {
				str = new Array(len + 1 - str.length).join(pad) + str;
			}
			return str;
		};

		var generate = function(secret, epoch) {
			var key = base32tohex(secret);
			// If no time is given, set time as now
			if(typeof epoch === 'undefined') {
				epoch = Math.round(new Date().getTime() / 1000.0);
			}
			var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0');

			// external library for SHA functionality
			var hmacObj = new jsSHA(time, "HEX");
			var hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX");

			var offset = 0;
			if (hmac !== 'KEY MUST BE IN BYTE INCREMENTS') {
				offset = hex2dec(hmac.substring(hmac.length - 1));
			}

			var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
			return (otp).substr(otp.length - 6, 6).toString();
		};

		// exposed functions
		return {
			generate: generate
		};
	};

	exports.KeyUtilities = KeyUtilities;

	// ----------------------------------------------------------------------------
	var KeysController = function() {
        var storageService = null;
        var keyUtilities = null;

		var init = function() {
            storageService = new StorageService();
			keyUtilities = new KeyUtilities(jsSHA);

			// Check if chrome.storage is supported
			if (storageService.isSupported()) {
                storageService.getObject('accounts', function(result) {
                    if (result == null || !result.hasOwnProperty("accounts")) {
                        addAccount('alice@google.com', 'JBSWY3DPEHPK3PXP');
                    }
                    else {
                        updateKeys();
                    }
                    setInterval(timerTick, 100);
                    setInterval(timerBar, 50);
                });
			} else {
				// No support for chrome.storage
				$('#updatingIn').text("x");
				$('#accountsHeader').text("No Storage support");
			}

			// Bind to keypress event for the input
			$('#add').click(function () {
				var name = $('#keyAccount').val();
				var secret = $('#keySecret').val();
				// remove spaces from secret
				secret = secret.replace(/ /g, '');
				if(secret !== '') {
					addAccount(name, secret);
                    $( "#addAccount" ).dialog("close");
				}
			});
		};

		var updateKeys = function() {
			var accountList = $('#accounts');
			// Remove all except the first line
			accountList.find("li").remove();

            storageService.getObject('accounts', function(result) {
                if (result != null && result.hasOwnProperty("accounts")) {
                    $.each(result.accounts, function (index, account) {
                        var key = keyUtilities.generate(account.secret);
                        var copConf;

                        // Construct HTML
                        var delLink = $('<div class="glyphicon glyphicon-remove-circle delLink jqueryui-tooltip" title="Click to delete"></div>');
                        delLink.click(function () {
                            $("#deleteAccount")
                                .dialog("open")
                                .attr("data-account-id", index);
                        });
                        var detLink = $('<div class="otp"><h3>' + key + '</h3><p>' + account.name + '</p></div>');

                        // We can copy to the clipboard in Chrome extensions
                        if (location.protocol == "chrome-extension:") {
                            detLink.addClass("jqueryui-tooltip")
                                .attr("title", "Click to copy")

                            copConf = $('<div class="copied">&#x2713; Copied to the clipboard</div>');
                            // Copy to clipboard on click
                            $( detLink ).click(function() {
                                var otp = $(this).find("h3").text();
                                $("#clipboard")
                                    .val(otp)
                                    .focus()
                                    .select();
                                document.execCommand('cut');
                                $(this).parent().find('.copied')
                                    .fadeIn(200)
                                    .delay(1000)
                                    .fadeOut(500);

                            });
                        }
                        var accElem = $('<li>').append(detLink).append(delLink).append(copConf);
                        // Add HTML element
                        accountList.append(accElem);
                    });
                }
                $(".jqueryui-tooltip").tooltip();
            });
		};

		var deleteAccount = function(index) {
            storageService.getObject('accounts', function(result) {
                // Remove object by index
                var accounts = result.accounts;
                accounts.splice(index, 1);

                storageService.setObject('accounts', accounts, function() {
                    updateKeys();
                });
            });
		};

		var addAccount = function(name, secret) {
			if(secret === '') {
				// Bailout
				return false;
			}

			// Construct JSON object
			var account = {
				'name': name,
				'secret': secret
			};

			// Persist new object
            storageService.getObject('accounts', function(result) {
                var accounts = [];
                if (result != null && result.hasOwnProperty("accounts")) {
                    accounts = result.accounts;
                }

                accounts.push(account);
                storageService.setObject('accounts', accounts, function() {
                    // Empty fields
                    $('#keyAccount').val('');
                    $('#keySecret').val('');

                    updateKeys();
                });
            });


			return true;
		};

		var timerTick = function() {
			var epoch = Math.round(new Date().getTime() / 1000.0);
			var countDown = 30 - (epoch % 30);
			if (epoch % 30 === 0 && epoch != lastUpdate) {
                lastUpdate = epoch;
				updateKeys();
			}
			$('#updatingIn').text(countDown);
		};

        var timerBar = function() {
            var epoch = new Date().getTime() / 1000.0;
            var countDown = 30 - (epoch % 30);
            $('#timebar').css("width", (countDown / 30) * 100 + "%");
        };

		return {
			init: init,
			addAccount: addAccount,
			deleteAccount: deleteAccount
		};
	};

	exports.KeysController = KeysController;

})(typeof exports === 'undefined' ? this['gauth']={} : exports);
