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


var StorageService = {}

StorageService.setObject = function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
StorageService.getObject = function(key) {
    var value = localStorage.getItem(key);
    return value && JSON.parse(value);
}

StorageService.isSupported = function() {
    return typeof (Storage) !== "undefined";
}


// Originally based on the JavaScript implementation as provided by Russell Sayers on his Tin Isles blog:
// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

var KeyUtilities = {}

KeyUtilities.dec2hex = function(s) {
    return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
}
KeyUtilities.hex2dec = function(s) {
    return parseInt(s, 16);
}

KeyUtilities.base32tohex = function(base32) {
    var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var bits = "";
    var hex = "";

    for (var i = 0; i < base32.length; i++) {
        var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += KeyUtilities.leftpad(val.toString(2), 5, '0');
    }
    
    for (var i = 0; i + 4 <= bits.length; i += 4) {
        var chunk = bits.substr(i, 4);
        hex = hex + parseInt(chunk, 2).toString(16);
    }
    
    return hex;
}

KeyUtilities.leftpad = function(str, len, pad) {
    if (len + 1 >= str.length) {
        str = Array(len + 1 - str.length).join(pad) + str;
    }
    return str;
}

KeyUtilities.generate = function(secret) {
    var key = KeyUtilities.base32tohex(secret);
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var time = KeyUtilities.leftpad(KeyUtilities.dec2hex(Math.floor(epoch / 30)), 16, '0');

    var hmacObj = new jsSHA(time, "HEX");
    var hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX");

    if (hmac != 'KEY MUST BE IN BYTE INCREMENTS') {
        var offset = KeyUtilities.hex2dec(hmac.substring(hmac.length - 1));
        // Debug
        //var part1 = hmac.substr(0, offset * 2);
        //var part2 = hmac.substr(offset * 2, 8);
        //var part3 = hmac.substr(offset * 2 + 8, hmac.length - offset);
    }

    var otp = (KeyUtilities.hex2dec(hmac.substr(offset * 2, 8)) & KeyUtilities.hex2dec('7fffffff')) + '';
    return (otp).substr(otp.length - 6, 6).toString();
}


var KeysController = {}

KeysController.init = function() {
    // Check if local storage is supported
    if (StorageService.isSupported()) {
        if (!StorageService.getObject('accounts')) {
            KeysController.addAccount('alice@google.com', 'JBSWY3DPEHPK3PXP');
        }

        KeysController.updateKeys();
        setInterval(KeysController.timerTick, 1000);
    } else {
        // No support for localStorage
        $('#updatingIn').text("x");
        $('#accountsHeader').text("No Storage support");
    }

    // Bind to keypress event for the input
    $('#add').click(function () {
        var name = $('#keyAccount').val();
        var secret = $('#keySecret').val();
        if(secret != '') {
            KeysController.addAccount(name, secret);
        }
    });
}

KeysController.timerTick = function() {
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var countDown = 30 - (epoch % 30);
    if (epoch % 30 == 0) {
        KeysController.updateKeys();
    }
    $('#updatingIn').text(countDown);
}

KeysController.updateKeys = function() {
    var accountList = $('#accounts');
    // Remove all except the first line
    accountList.find("li:gt(0)").remove();

    $.each(StorageService.getObject('accounts'), function (index, account) {
        var key = KeyUtilities.generate(account.secret);

        // Construct HTML
        var delLink = $('<a href="#"></a>');
        delLink.click(function () {
            KeysController.deleteAccount(index)
        });
        var detLink = $('<a href="#"><h3>' + key + '</h3><p>' + account.name + '</p></a>');
        var accElem = $('<li>').append(detLink).append(delLink);
        // Add HTML element
        accountList.append(accElem);
    });
    accountList.listview('refresh');
}

KeysController.deleteAccount = function(index) {
    // Retrieve current objects
    var accounts = StorageService.getObject('accounts');
    accounts.splice(index, 1);

    // Persist in localstorage
    StorageService.setObject('accounts', accounts);

    KeysController.updateKeys();
}

KeysController.addAccount = function(name, secret) {
    if(secret == '') {
        // Bailout
        return false;
    }

    // Construct JSON object
    var account = {
        'name': name,
        'secret': secret
    };

    // Get existing list of objects
    var accounts = StorageService.getObject('accounts');
    if (!accounts) {
        accounts = [];
    }

    // Add to list
    accounts.push(account);

    // Empty fields
    $('#keyAccount').val('');
    $('#keySecret').val('');

    // Persist in localstorage
    StorageService.setObject('accounts', accounts);

    KeysController.updateKeys();

    return true;
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

    KeysController.init();
});
