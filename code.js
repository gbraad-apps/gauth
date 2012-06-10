// Originally based on the JavaScript implementation as provided by Tin Isles:
// http://blog.tinisles.com/2011/10/google-authenticator-one-time-password-algorithm-in-javascript/

function dec2hex(s) {
    return (s < 15.5 ? '0' : '') + Math.round(s).toString(16);
}

function hex2dec(s) {
    return parseInt(s, 16);
}

function base32tohex(base32) {
    var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    var bits = "";
    var hex = "";

    for (var i = 0; i < base32.length; i++) {
        var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        bits += leftpad(val.toString(2), 5, '0');
    }

    // leftpad bits with 0 until length is a multiple of 4
    while (bits.length % 4 != 0) {
        bits = "0" + bits;
    }

    for (var i = bits.length - 4; i >= 0; i = i - 4) {
        var chunk = bits.substr(i, 4);
        hex = parseInt(chunk, 2).toString(16) + hex;
    }
    return hex;
}

function leftpad(str, len, pad) {
    if (len + 1 >= str.length) {
        str = Array(len + 1 - str.length).join(pad) + str;
    }
    return str;
}

function updateOtp(secret) {
    var key = base32tohex(secret);
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var time = leftpad(dec2hex(Math.floor(epoch / 30)), 16, '0');

    var hmacObj = new jsSHA(time, "HEX");
    var hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX");

    if (hmac != 'KEY MUST BE IN BYTE INCREMENTS') {
        var offset = hex2dec(hmac.substring(hmac.length - 1));
        // Debug
        //var part1 = hmac.substr(0, offset * 2);
        //var part2 = hmac.substr(offset * 2, 8);
        //var part3 = hmac.substr(offset * 2 + 8, hmac.length - offset);
    }

    var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec('7fffffff')) + '';
    return (otp).substr(otp.length - 6, 6).toString();
}

function timerTick() {
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var countDown = 30 - (epoch % 30);
    if (epoch % 30 == 0) {
        updateKeys();
    }
    $('#updatingIn').text(countDown);
}

function updateKeys() {
    var accountList = $('#accounts');
    // Remove all except the first line
    accountList.find("li:gt(0)").remove();

    $.each(getObject('accounts'), function (index, account) {
        var key = updateOtp(account.secret);
        var delLink = $('<a href="#"></a>');
        delLink.click(function () {
            deleteAccount(index)
        });
        var detLink = $('<a href="#"><h3>' + key + '</h3><p>' + account.name + '</p></a>');
        var accElem = $('<li>').append(detLink).append(delLink);

        accountList.append(accElem);
    });
    accountList.listview('refresh');
}

function deleteAccount(index) {
    var accounts = getObject('accounts');
    accounts.splice(index, 1);
    // Persist in localstorage
    setObject('accounts', accounts);

    updateKeys();
}

function setObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getObject(key) {
    var value = localStorage.getItem(key);
    return value && JSON.parse(value);
}

// Main function
$(function () {
    // Check if local storage is supported
    if (typeof (Storage) !== "undefined") {
        if (!getObject('accounts')) {
            // Default information
            var account = [{
                'name': 'alice@google.com',
                'secret': 'JBSWY3DPEHPK3PXP'
            }, ];
            setObject('accounts', account);
        }

        updateKeys();
        setInterval(timerTick, 1000);
    } else {
        // No support for localStorage
        $('#updatingIn').text("x");
        $('#account').text("No Storage support");
    }

    $('#save').click(function () {
        // Save in local storage
        var account = {
            'name': $('#keyAccount').val(),
            'secret': $('#keySecret').val()
        };
        var accounts = getObject('accounts');
        accounts.push(account);

        // Empty fields
	$('#keyAccount').val('');
        $('#keySecret').val('');

        // Persist in localstorage
        setObject('accounts', accounts);

        updateKeys();
    });
});
