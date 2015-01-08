// Main function
$( document ).ready(function() {

    // Use exports from locally defined module
    var keysController = new gauth.KeysController();
    keysController.init();

    var dialogOpts = {
        autoOpen: false,
        modal: true,
        minWidth: 450,
        show: 500,
        hide: 500
    };

    $( "#about" ).dialog( dialogOpts );
    $( "#addAccount" ).dialog( dialogOpts );
    $( "#deleteAccount" ).dialog( dialogOpts );

    $(".about").click(function() {
        $( "#about" ).dialog("open");
    });
    $(".add-account").click(function() {
        $( "#addAccount" ).dialog("open");
    });
    $(".cancel").click(function() {
        $( "#addAccount, #deleteAccount, #about" ).dialog("close");
    });
    $("#delete").click(function() {
        var index = $("#deleteAccount").attr("data-account-id");
        keysController.deleteAccount(index);
        $("#deleteAccount").dialog("close")
    });

    $(".jqueryui-tooltip").tooltip();
});

