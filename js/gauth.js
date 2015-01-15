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

        var passphrase = null;

        /**
         * Save an item to the storage and then execute the callback function
         *
         * @Throws Error if no storage type is available. Make sure to check
         * first with this.isSupported().
         */
        var setItem = function(key, value, encrypt, callback) {
            if (encrypt === true) {
                var encrypted = encryptString(JSON.stringify(value));
                if (encrypted.length > 0) {
                    value = encrypted;
                }
            }

            if (this.getStorageType() === "chrome") {
                var valueObj = {};
                valueObj[key] = value;
                chrome.storage.sync.set(valueObj, function() {
                    callback();
                });
            }
            else if (this.getStorageType() === "localStorage") {
                if (typeof (value) !== "string") {
                    value = JSON.stringify(value);
                }
                localStorage.setItem(key, value);
                callback();
            }
            else {
                throw new Error("No storage type available");
            }
        };

        /**
         * Get an item from the storage and then execute the callback function
         *
         * @Param string key The key to retrieve from the storage
         * @Param boolean decrypt Whether we should attempt to decrypt the data
         * @Param function callback The callback function to execute
         *
         * @Throws Error if no storage type is available. Make sure to check
         * first with this.isSupported().
         */
        var getItem = function(key, decrypt, callback) {
            if (this.getStorageType() === "chrome") {
                chrome.storage.sync.get(key, function(result) {
                    var obj;
                    var string = result[key];

                    if (decrypt === true) {
                        var decrypted = decryptString(string);
                        if (decrypted.length > 0) {
                            string = decrypted;
                        }
                    }

                    try {
                        obj = JSON.parse(string);
                        if (obj !== null) {
                            result = {};
                            result[key] = obj;
                        }
                        else {
                            result = string;
                        }
                    }
                    catch(e) { }

                    callback(result);
                });
            }
            else if (this.getStorageType() === "localStorage") {
                var obj;
                var result;
                var string = localStorage.getItem(key);

                if (decrypt === true) {
                    var decrypted = decryptString(string);
                    if (decrypted.length > 0) {
                        string = decrypted;
                    }
                }

                try {
                    obj = JSON.parse(string);
                    if (obj !== null) {
                        result = {};
                        result[key] = obj;
                    }
                    else {
                        result = string;
                    }
                }
                catch(e) {
                    result = string;
                }

                callback(result);
            }
            else {
                throw new Error("No storage type available");
            }
        };

        /**
         * Check if there are any storage types available
         *
         * @Return boolean
         */
        var isSupported = function() {
            return this.localStorageIsSupported() || this.chromeSotrageIsSupported();
        };

        /**
         * Check if localStorage is available
         *
         * @Return boolean
         */
        var localStorageIsSupported = function() {
            return typeof (Storage) !== "undefined";
        };

        /**
         * Check chrome.storage is available
         *
         * @Return boolean
         */
        var chromeSotrageIsSupported = function() {
            return typeof (chrome) !== "undefined" && typeof (chrome.storage) !== "undefined";
        };

        /**
         * Gets the type of storage used. If both types are available, it will
         * prefer chrome.storage unless values already exist in localStorage
         *
         * @Return String "chrome" or "localStorage"
         *
         * @Throws Error if no storage type is available. Make sure to check
         * first with this.isSupported().
         *
         * @NOTE: This will also set default values to the corresponding storage
         * type if none currently exist.
         */
        var getStorageType = function() {
            if (!this.isSupported()) {
                throw new Error("No storage type available");
            }

            // An object containing the default values for first use
            var defaults = {
                accounts: [
                    {
                        name: 'example@google.com',
                        secret: 'JBSWY3DPEHPK3PXP'
                    }
                ]
            };

            // Check if this key exists in the storage types
            var checkKey = 'accounts';

            // Try localStorage
            if (this.localStorageIsSupported()) {
                var keyExists = (localStorage.getItem(checkKey) !== null);

                // localStorage is not in use, so use chrome.storage if it is
                // available
                if (keyExists === false && this.chromeSotrageIsSupported()) {
                    chrome.storage.sync.get(checkKey, function(result) {
                        // Chrome is not in use, so add default values
                        if (result === null || !result.hasOwnProperty(checkKey)) {
                            chrome.storage.sync.set(defaults);
                        }
                    });
                    return "chrome";
                }

                // We need to use localStorage.

                // Add default values if necessary:
                if (keyExists === false) {
                    for (var property in defaults) {
                        if (defaults.hasOwnProperty(property)) {
                            localStorage.setItem(
                                property,
                                JSON.stringify(defaults[property])
                            );
                        }
                    }
                }
                return 'localStorage';
            }

            // Nope, localStorage won't work, so Chrome it is...
            chrome.storage.sync.get(checkKey, function(result) {
                // Chrome is not in use, so add default values
                if (result === null || !result.hasOwnProperty(checkKey)) {
                    chrome.storage.sync.set(defaults);
                }
            });
            return "chrome";
        };

        function savePassphrase(password) {
            var obj = {};
            if (localStorageIsSupported()) {
                var config = localStorage.getItem("config");

                if (config !== null) {
                    obj = JSON.parse(config);
                }
                obj.passphrase = password;

                var json = JSON.stringify(obj);

                localStorage.setItem("config", json);
            }
            else {
                passphrase = password;
            }
        }

        function getPassphrase() {
            var pass;

            if (localStorageIsSupported()) {
                var config = localStorage.getItem("config");
                if (config === null) {
                    return "";
                }
                var obj = JSON.parse(config);
                pass = obj.passphrase;
            }
            else {
                pass = passphrase;
            }
            if (typeof (pass) === "undefined" || pass === null) {
                return "";
            }
            return pass;
        }

        var encryptString = function(string) {
            var passphrase = getPassphrase();

            if (passphrase.length > 0) {
                var encrypted = CryptoJS.AES.encrypt(string, passphrase);
                return encrypted.toString();
            }
            return "";
        };

        var decryptString = function(string, passphrase) {
            if (typeof (passphrase) === "undefined") {
                passphrase = getPassphrase();
            }

            if (passphrase.length > 0) {
                var decrypted = CryptoJS.AES.decrypt(string, passphrase);
                return decrypted.toString(CryptoJS.enc.Utf8);
            }
            return "";
        };

        var moveToChrome = function() {
            var accounts = localStorage.getItem("accounts");
            var valueObj = {};
            valueObj.accounts = JSON.parse(accounts);
            chrome.storage.sync.set(valueObj, function() {
                localStorage.removeItem("accounts");
            });
            alert("Chrome storage has been enabled. Syncing on.");
        };

        var moveToLocalStorage = function() {
            chrome.storage.sync.get(null, function(items) {
                var json;

                for (var key in items) {
                    if (items.hasOwnProperty(key)) {
                        json = JSON.stringify(items[key]);
                        localStorage.setItem(key, json);
                        chrome.storage.sync.remove(key);
                    }
                }
                alert("Chrome storage has been disabled. Syncing off.");
            });
        };

        // exposed functions
        return {
            isSupported: isSupported,
            getItem: getItem,
            setItem: setItem,
            localStorageIsSupported: localStorageIsSupported,
            chromeSotrageIsSupported: chromeSotrageIsSupported,
            getStorageType: getStorageType,
            savePassphrase: savePassphrase,
            decryptString: decryptString,
            moveToChrome: moveToChrome,
            moveToLocalStorage: moveToLocalStorage
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

            // Check if storage is supported
            if (storageService.isSupported()) {
                updateKeys();
                updateSettingsAccountList();
                setInterval(timerTick, 100);
                setInterval(timerBar, 50);
                setExportString();
            } else {
                // No storage support
                var str = 'Error: Either your browser does not support web ';
                str += 'storage or it has been disabled.';
                $('#updatingIn').text("x");
                $('#accountsHeader').html(str);
            }
        };

        var updateSettingsAccountList = function() {
            var accountList = $('#settings-accounts');
            var newLIelems = [];

            storageService.getItem('accounts', true, function(result) {
                if (result !== null && result.hasOwnProperty("accounts")) {
                    if (result.accounts.length > 0) {
                        $.each(result.accounts, function (index, account) {

                            // Construct HTML
                            var delLink = $('<span class="glyphicon glyphicon-remove-circle delLink bs-tooltip" title="Delete"></span>');
                            delLink.click(function () {
                                $("#deleteAccount")
                                    .attr("data-account-id", index)
                                    .modal("show");
                            });

                            var editLink = $('<span class="glyphicon glyphicon-pencil editLink bs-tooltip" title="Edit"></span>');
                            editLink.click(function () {
                                $("#editAccount")
                                    .attr("data-account-id", index)
                                    .attr("data-account-name", account.name)
                                    .modal("show");
                            });

                            var detLink = $('<span><span class="settings-account-name">' + account.name + '</span></span>');

                            detLink.append(editLink).append(delLink);

                            // Add HTML element to the array
                            newLIelems[index] = $('<li>').append(detLink);
                        });
                    }
                    else {
                        newLIelems[0] = $('<li>No accounts available. Try adding one.</li>');
                    }
                    setExportString();
                }

                // Remove and append all in one go. This is faster (i.e. less
                // visual lag) than removing and then trying to calculate what
                // to append and appending it.
                accountList.find("li").remove();

                $.each(newLIelems,function(){
                    accountList.append(this);
                });

                $(".bs-tooltip").tooltip({
                    placement: "auto"
                });
            });
        };

        var updateKeys = function() {
            var accountList = $('#accounts');
            var newLIelems = [];

            storageService.getItem('accounts', true, function(result) {
                if (result !== null && result.hasOwnProperty("accounts")) {
                    if (result.accounts.length > 0) {
                        $.each(result.accounts, function (index, account) {
                            var key = keyUtilities.generate(account.secret);
                            var copConf;

                            // Construct HTML
                            var detLink = $('<div class="otp"><h3>' + key + '</h3><p>' + account.name + '</p></div>');

                            // We can copy to the clipboard in Chrome extensions
                            if (location.protocol === "chrome-extension:") {
                                detLink.addClass("bs-tooltip")
                                    .attr("title", "Click to copy");

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
                            // Add HTML element to the array
                            newLIelems[index] = $('<li>').append(detLink).append(copConf);
                        });
                    }
                    else {
                        newLIelems[0] = $('<li>No accounts available. Try adding one.</li>');
                    }
                }

                // Remove and append all in one go. This is faster (i.e. less
                // visual lag) than removing and then trying to calculate what
                // to append and appending it.
                accountList.find("li").remove();

                $.each(newLIelems,function(){
                    accountList.append(this);
                });

                $(".bs-tooltip").tooltip({
                    placement: "auto"
                });
            });
        };

        var deleteAccount = function(index) {
            storageService.getItem('accounts', true, function(result) {
                // Remove object by index
                var accounts = result.accounts;
                accounts.splice(index, 1);

                storageService.setItem('accounts', accounts, true, function() {
                    updateSettingsAccountList();
                });
            });
        };

        var editAccount = function(index, name, secret) {
            if (name === '') {
                // Bailout
                return false;
            }
            storageService.getItem('accounts', true, function(result) {
                if (result !== null && result.hasOwnProperty("accounts")) {
                    var accounts = result.accounts;

                    // Update values
                    accounts[index].name = name;
                    if (secret !== '') {
                        accounts[index].secret = secret;
                    }

                    // Save changes
                    storageService.setItem('accounts', accounts, true, function() {
                        // Empty fields
                        $('#newKeyAccount').val('');
                        $('#newKeySecret').val('');

                        updateSettingsAccountList();
                    });
                }
            });


            return true;
        };

        var addAccount = function(name, secret) {
            if (secret === '' || name === '') {
                // Bailout
                return false;
            }

            // Construct JSON object
            var account = {
                'name': name,
                'secret': secret
            };

            // Persist new object
            storageService.getItem('accounts', true, function(result) {
                var accounts = [];
                if (result !== null && result.hasOwnProperty("accounts")) {
                    accounts = result.accounts;
                }

                accounts.push(account);
                storageService.setItem('accounts', accounts, true, function() {
                    // Empty fields
                    $('#keyAccount').val('');
                    $('#keySecret').val('');

                    updateSettingsAccountList();
                });
            });


            return true;
        };

        var timerTick = function() {
            var epoch = Math.floor(new Date().getTime() / 1000.0);
            var countDown = 30 - (epoch % 30);
            if (epoch % 30 === 0 && epoch !== lastUpdate) {
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

        var setExportString = function() {
            storageService.getItem('accounts', false, function(result) {
                if (result !== null && result.hasOwnProperty("accounts")) {
                    var accounts = result.accounts;
                    if (typeof (accounts) === "string") {
                        $("#exportText").val(accounts);
                    }
                    else {
                        $("#exportText").val(JSON.stringify(accounts));
                    }
                }
                else {
                     $("#exportText").val(result);
                }
            });
        };

        var exportToFile = function() {
            storageService.getItem('accounts', false, function(result) {
                var exportString;

                if (result !== null && result.hasOwnProperty("accounts")) {
                    var accounts = result.accounts;
                    if (typeof (accounts) === "string") {
                        exportString = accounts;
                    }
                    else {
                        exportString = JSON.stringify(accounts);
                    }
                }
                else {
                    exportString = result;
                }

                var anchor = document.createElement('a');
                anchor.setAttribute('href', 'data:text/plain;charset=utf-8,' + exportString);
                anchor.setAttribute('download', "gauth-export.json");
                anchor.click();
            });

        };

        var importAccounts = function(string, passphrase) {
            var accounts;

            // If string is JSON, we don't need to decrypt
            try {
                accounts = JSON.parse(string);
                passphrase = "";
            }
            catch(e) {
                var decrypted = storageService.decryptString(string, passphrase);
                try {
                    accounts = JSON.parse(decrypted);
                }
                catch(e) {
                    return false;
                }
            }

            storageService.savePassphrase(passphrase);
            storageService.setItem('accounts', accounts, true, function() {
                updateSettingsAccountList();
            });

            return true;
        };

        var encryptAccounts = function(password) {
            storageService.getItem('accounts', true, function(result) {
                if (result !== null && result.hasOwnProperty("accounts")) {
                    storageService.savePassphrase(password);
                    storageService.setItem('accounts', result.accounts, true, function() {
                        $("#password").val("");
                        $("#password2").val("");
                        alert("Accounts encrypted");
                    });
                }
            });
        };

        var isSyncEnabled = function() {
            return (storageService.getStorageType() === "chrome");
        };

        var toggleSync = function(enabled) {
            if (enabled === true) {
                storageService.moveToChrome();
            }
            else {
                storageService.moveToLocalStorage();
            }
        };

// [{"name":"alice@google.com","secret":"JBSWY3DPEHPK3PXP"}]


        return {
            init: init,
            addAccount: addAccount,
            deleteAccount: deleteAccount,
            editAccount: editAccount,
            updateKeys: updateKeys,
            updateSettingsAccountList: updateSettingsAccountList,
            importAccounts: importAccounts,
            exportToFile: exportToFile,
            encryptAccounts: encryptAccounts,
            isSyncEnabled: isSyncEnabled,
            toggleSync: toggleSync
        };
    };

    exports.KeysController = KeysController;

})(typeof exports === 'undefined' ? this.gauth={} : exports);
