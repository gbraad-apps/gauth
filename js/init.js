// Init function
$(document).bind('mobileinit', function(){
    $.mobile.defaultPageTransition = 'none';
    $.mobile.defaultDialogTransition = 'none';
});

$(function() {
    // Initialize external panels
    $("body>[data-role='panel']").panel().enhanceWithin();
});