/*jslint browser: true*/
/*global $*/
/*global CCH*/
/*global initializeLogging*/
/*global LOG*/
/*global OpenLayers*/
/*global splashUpdate*/
$(document).ready(function () {

	initializeLogging({
		LOG4JS_LOG_THRESHOLD: CCH.CONFIG.development ? 'debug' : 'info'
	});

	CCH.LOG = LOG;

	CCH.items = new CCH.Objects.Items();

	CCH.map = new CCH.Objects.Back.Map();

	CCH.ows = new CCH.Util.OWS();

	// I am loading an item with the full subtree so once that item is loaded, start loading the rest of the application
	$(window).on('cch.item.loaded', function (evt, args) {
		var id = args.id || '',
			item;

		if (CCH.CONFIG.itemId === id) {
			CCH.CONFIG.item = CCH.items.getById({id : id});
			item = CCH.CONFIG.item;
			CCH.ui = new CCH.Objects.Back.UI({item: item});
			CCH.map.addLayers(item.showLayer().layers);

			// Clear the overlay
			$('#application-overlay').fadeOut(2000, function () {
				$('#application-overlay').remove();
			});
		}
	});

	new CCH.Objects.Item({
		id: CCH.CONFIG.itemId
	}).load({
		subtree: true,
		callbacks: {
			error: [
				function (jqXHR, textStatus, errorThrown) {
					var continueLink = $('<a />').attr({
						'href': CCH.CONFIG.contextPath,
						'role': 'button'
					}).addClass('btn btn-lg').html('<i class="fa fa-refresh"></i> Click to continue'),
						emailLink = $('<a />').attr({
						'href': 'mailto:' + CCH.CONFIG.emailLink + '?subject=Application Failed To Load Item (URL: ' + window.location.toString() + ' Error: ' + errorThrown + ')',
						'role': 'button'
					}).addClass('btn btn-lg').html('<i class="fa fa-envelope"></i> Contact Us');

					if (404 === jqXHR.status) {
						splashUpdate("<b>Item Not Found</b><br /><br />We couldn't find the item you are looking for<br /><br />");
					} else {
						splashUpdate("<b>There was an error attempting to load an item.</b><br />Either try to reload the application or contact the system administrator.<br /><br />");
					}
					splashAppend(continueLink);
					splashAppend(emailLink);
					$('.splash-spinner').fadeOut(2000);
				}
			]
		}
	});

	// http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
	String.prototype.hashCode = function () {
		var hash = 0, i, chr, len;
		if (this.length === 0)
			return hash;
		for (i = 0, len = this.length; i < len; i++) {
			chr = this.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};
});
