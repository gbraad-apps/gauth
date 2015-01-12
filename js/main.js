// Main function
$(document).on('pagecreate', '#main', function() {
	// Use exports from locally defined module
	var keysController = new gauth.KeysController();
	keysController.init();
});
