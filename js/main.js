// Main function
$( document ).ready(function() {

    // Use exports from locally defined module
    var keysController = new gauth.KeysController();
    keysController.init();

    // This keeps accounts in sync when editing in another page and returning
    // to the original page
    $(window).on("focus", function() {
        keysController.updateKeys();
        keysController.updateSettingsAccountList();
    });

    $('#add').click(function () {
        var name = $('#keyAccount').val();
        var secret = $('#keySecret').val();
        // remove spaces from secret
        secret = secret.replace(/ /g, '');
        if (secret !== '' && name !== '') {
            if (keysController.addAccount(name, secret)) {
                $( "#addAccount" ).modal("hide");
            }
        }
    });

    $('#edit').click(function () {
        var name = $('#newKeyAccount').val();
        var secret = $('#newKeySecret').val();
        var index = $("#editAccount").attr("data-account-id");
        // remove spaces from secret
        secret = secret.replace(/ /g, '');
        if (keysController.editAccount(index, name, secret)) {
            $( "#editAccount" ).modal("hide");
        }
    });

    $("#delete").click(function() {
        var index = $("#deleteAccount").attr("data-account-id");
        keysController.deleteAccount(index);
        $("#deleteAccount").modal("hide");
    });

    $('#editAccount').on('show.bs.modal', function (e) {
        $("#accountName").text($(this).attr("data-account-name"));
        $("#newKeyAccount").val($(this).attr("data-account-name"));

    });

    $(".bs-tooltip").tooltip({
        placement: "auto"
    });

    // Make it so that only one menu option can be highlighted at a time
    $(".navbar-left a").click(function() {
        $(".navbar-right li").removeClass("active");
    });
    $(".navbar-right a").click(function() {
        $(".navbar-left li").removeClass("active");
    });

    // Enable chrome extension specific stuff
    if (location.protocol === "chrome-extension:") {
        $("#copyButton").show().click(function() {
            $("#exportText").get(0).select();
            document.execCommand("copy");
        });

        $(".onlyForChromeExtensions").show();

        if (keysController.isSyncEnabled() === true) {
            $("input[name=syncEnabled][value=1]").prop('checked', true);
        }
        else {
            $("input[name=syncEnabled][value=0]").prop('checked', true);
        }
        $("#saveSync").click(function() {
            var sync = ($("input[name=syncEnabled]:checked").val() === "1");
            keysController.toggleSync(sync);
        });
    }
    else {
        $("#selectAllButton").show().click(function() {
            $("#exportText").get(0).select();
        });
    }

    $("#importButton").click(function() {
        var string = $("#importText").val();
        var passphrase = $("#importPassphrase").val();
        if (keysController.importAccounts(string, passphrase) === false) {
            alert("Whoops! Something went wrong. Make sure your passphrase is correct");
        }
        else {
            $("#importText").val("");
            $("#importPassphrase").val("");
            alert("Accounts imported successfully");
        }
    });

    $("#exportButton").click(function() {
        keysController.exportToFile();
    });

    $("#savePassphrase").click(function() {
        var password = $("#password").val();
        var password2 = $("#password2").val();

        if (password !== password2) {
            alert("Passphrases do not match");
        }
        else {
            if (password.length > 0) {
                keysController.encryptAccounts(password);
            }
        }
    });

});