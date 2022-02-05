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

    var StorageService = function() {
        var setObject = function(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        };

        var getObject = function(key) {
            var value = localStorage.getItem(key);
            // if(value) return parsed JSON else undefined
            return value && JSON.parse(value);
        };

        var isSupported = function() {
            return typeof (Storage) !== "undefined";
        };

        // exposed functions
        return {
            isSupported: isSupported,
            getObject: getObject,
            setObject: setObject
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

            // HMAC generator requires secret key to have even number of nibbles
            if (key.length % 2 !== 0) {
                key += '0';
            }

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

            var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) % 1000000 + '';
            return Array(7 - otp.length).join('0') + otp;
        };

        // exposed functions
        return {
            generate: generate
        };
    };

    exports.KeyUtilities = KeyUtilities;

    // ----------------------------------------------------------------------------
    var KeysController = function() {
        var storageService = null,
            keyUtilities = null,
            editingEnabled = false;

        var init = function() {
            storageService = new StorageService();
            keyUtilities = new KeyUtilities(jsSHA);

            // Check if local storage is supported
            if (storageService.isSupported()) {
                if (!storageService.getObject('accounts')) {
                    //addAccount('alice@google.com (demo account)', 'JBSWY3DPEHPK3PXP');
                    storageService.setObject('accounts', []);
                    toggleEdit();
                }

                updateKeys();
                setInterval(timerTick, 1000);
            } else {
                // No support for localStorage
                $('#updatingIn').text("x");
                $('#accountsHeader').text("No Storage support");
            }

            // Bind to keypress event for the input
            $('#addKeyButton').click(function() {
                var name = $('#keyAccount').val();
                var secret = $('#keySecret').val();
                // remove spaces from secret
                secret = secret.replace(/ /g, '');
                if(secret !== '') {
                    addAccount(name, secret);
                    clearAddFields();
                    $.mobile.navigate('#main');
                } else {
                    $('#keySecret').focus();
		}
            });

            $('#addKeyCancel').click(function() {
                clearAddFields();
            });

            var clearAddFields = function() {
                $('#keyAccount').val('');
		        $('#keySecret').val('');
            };

            $('#edit').click(function() { toggleEdit(); });
            $('#export').click(function() { exportAccounts(); });
            $('#import').click(function() {
		// Sneakily "delegate" the click to an invisible INPUT
		// element.  That lets us use the input's `files`
		// while maintaining a consistent button UI.
                $('#import-files').click();
            });
            $('#import-files').change(function(evt) {
                importAccounts(evt);
            });
        };

        var updateKeys = function() {
            var accountList = $('#accounts');
            // Remove all except the first line
            accountList.find("li:gt(0)").remove();

            $.each(storageService.getObject('accounts'), function (index, account) {
                var key = keyUtilities.generate(account.secret);

                // Construct HTML
                var accName = $('<p>').text(account.name).html();  // print as-is
                var detLink = $('<span class="secret"><h3>' + key + '</h3>' + accName + '</span>');
                var accElem = $('<li data-icon="false">').append(detLink);
 
                if(editingEnabled) {
                    var delLink = $('<p class="ui-li-aside"><a class="ui-btn-icon-notext ui-icon-delete" href="#"></a></p>');
                    delLink.click(function () {
                        deleteAccount(index);
                    });
                    accElem.append(delLink);
                } else {
		    // If not selecting for deletion, copy the key on click.
		    accElem.click(function () {
			navigator.clipboard.writeText(key).then(function () {
			    toastr.success(`Copied key ${key} for ${account.name}`)
			}).catch(function (e) {
			    toastr.error('Unable to copy key: missing clipboard access permission');
			});
		    });
                }

                // Add HTML element
                accountList.append(accElem);
            });
            accountList.listview().listview('refresh');
        };

        var toggleEdit = function() {
            editingEnabled = !editingEnabled;
            if(editingEnabled) {
                $('#addButton').show();
            } else {
                $('#addButton').hide();
            }
            updateKeys();
        };

        var exportAccounts = function() {
            var accounts = JSON.stringify(storageService.getObject('accounts'));
            var blob = new Blob([accounts], {type: 'text/plain;charset=utf-8'});

            saveAs(blob, 'gauth-export.json');
        };

	// Helper to ensure that parsed objects are arrays of
	// name/secret keyed objects.
	const validateAccountData = function(data) {
	    if (!(data instanceof Array)) {
		throw new SyntaxError("Account list is not an array");
	    }
	    if (data.length === 0) {
		throw new SyntaxError("Account list is empty");
	    }
	    // Helper to check if its argument is a string.
	    const isNonemptyString = function (val) {
		return (typeof val === "string" || val instanceof String) &&
		    val.length > 0;
	    }

	    for (let index = 0; index < data.length; ++index) {
		const element = data[index];
		const keys = Object.keys(element).sort();
		if (keys.length !== 2) {
		    throw new SyntaxError(`Account data at index ${index} has unexpected entries: ${keys}`);
		}
		if (keys[0] !== "name") {
		    throw new SyntaxError(`Account data at index ${index} has no account name`);
		} else if(!isNonemptyString(element.name)) {
		    throw new SyntaxError(`Account data at index ${index} has invalid account name: '${element.name}'`);
		}
		if (keys[1] !== "secret") {
		    throw new SyntaxError(`Account data at index ${index} has no account secret`);
		} else if(!isNonemptyString(element.secret)) {
		    throw new SyntaxError(`Account data at index ${index} has invalid account secret: '${element.secret}'`);
		}
	    }
	};

	// Merge new_data into dest, skipping duplicate secrets.
	// This requires both to be valid account lists.
	var mergeAccountData = function(dest, new_data) {
	    const existing = {};
	    for (const element of dest) {
		existing[element.secret] = element.name;
	    }
	    for (const element of new_data) {
		const prior_name = existing[element.secret];
		if (prior_name !== undefined) {
		    toastr.warning(`Skipping account "${element.name}"; duplicate of "${prior_name}"`);
		} else {
		    dest.push({name: element.name, secret: element.secret});
		}
	    }
	};

        var importAccounts = async function(evt) {
            const files = evt.target.files;
            if (files.length === 0) {
                toastr.warning("Please select one or more files to upload.");
                return;
            }
	    const new_accounts = [];
	    var valid_files = 0;
	    for (const file of files) {
		const text = await file.text();
		try {
		    const data = JSON.parse(text)
		    validateAccountData(data);
		    valid_files += 1;
		    let len = new_accounts.length;
		    mergeAccountData(new_accounts, data);
		    console.log(`Read ${data.length} accounts from ${file.name}, ${new_accounts.length - len} unique`);
		} catch (e) {
		    console.warn(`Error processing ${file.name}`, e);
		    toastr.error(e, `Import failed on ${file.name}: invalid JSON data.`);
		}
	    }
	    if (new_accounts.length > 0) {
		const accounts = storageService.getObject('accounts');
		var len = accounts.length;
		mergeAccountData(accounts, new_accounts);
		len = accounts.length - len;
		console.log(`Added total of new ${len} new accounts`);
		storageService.setObject('accounts', accounts);
		updateKeys();
		toastr.success(`Imported ${new_accounts.length} accounts (${len} new) from ${valid_files} file${valid_files > 1 ? "s" : ""}`);
	    } else {
		toastr.warning('No accounts imported');
	    }
        };

        var deleteAccount = function(index) {
            // Remove object by index
            var accounts = storageService.getObject('accounts');
            accounts.splice(index, 1);
            storageService.setObject('accounts', accounts);

            updateKeys();
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
            var accounts = storageService.getObject('accounts');
            if (!accounts) {
                // if undefined create a new array
                accounts = [];
            }
            accounts.push(account);
            storageService.setObject('accounts', accounts);

            updateKeys();
            toggleEdit();

            return true;
        };

        var timerTick = function() {
            var epoch = Math.round(new Date().getTime() / 1000.0);
            var countDown = 30 - (epoch % 30);
            if (epoch % 30 === 0) {
                updateKeys();
            }
            $('#updatingIn').text(countDown);
        };

        return {
            init: init,
            addAccount: addAccount,
            deleteAccount: deleteAccount
        };
    };

    exports.KeysController = KeysController;

})(typeof exports === 'undefined' ? this['gauth']={} : exports);
