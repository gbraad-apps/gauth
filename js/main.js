// Main function
$(document).on('pagecreate', '#main', function() {
	// Background styling for dialogs
	$('div[data-role="dialog"]').live('pagebeforeshow', function(e, ui) {
		ui.prevPage.addClass("ui-dialog-background");
	});

	$('div[data-role="dialog"]').live('pagehide', function(e, ui) {
		$(".ui-dialog-background ").removeClass("ui-dialog-background");
	});

	// Use exports from locally defined module
	var keysController = new gauth.KeysController();
	keysController.init();
});
