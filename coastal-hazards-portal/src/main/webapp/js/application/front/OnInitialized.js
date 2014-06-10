/*global CCH*/
/*global splashUpdate*/
/*global OpenLayers*/
/*global alertify*/
window.CCH = CCH || {};
CCH.CONFIG = CCH.CONFIG || {};

/**
 * Loads the top-level item for the entire portal
 * 
 * @param {type} args
 * @returns {undefined}
 */
CCH.CONFIG.loadUberItem = function (args) {
	"use strict";
	args = args || {};

	var zoomToBbox = args.zoomToBbox === true ? true : false,
		// Do I load the entire item with all its children? 
		subtree = args.subtree || false,
		overridePreviousBounds = args.overridePreviousBounds,
		callbacks = args.callbacks || {
			success: [],
			error: []
		};

	callbacks.error.unshift(CCH.ui.errorResponseHandler);
	callbacks.success.unshift(function (data) {
		$(window).on('cch.item.loaded', function (evt, obj) {
			var item;

			// If the incoming item is the uber item, that means that by now, everything under it has been
			// fully hydrated, so I can now add sub items to the accordion and remove the overlay
			if (obj.id === 'uber') {
				data.children.each(function (id, index) {
					item = CCH.items.getById({id: id});

					// Add it to the accordion...
					CCH.ui.accordion.addCard({
						item: item,
						index: index
					});
					item = CCH.items.getById({id: id});
				});

				var resizeHandler = function () {
					// Unbind this one-time function
					$(window).off('cch.ui.resized', resizeHandler);
					// Is the user coming in from another part of the application?
					if (CCH.session.isReturning() === true && CCH.session.getCookie().center && !overridePreviousBounds) {
						// This gets set in the cookie when visitors click 'back to portal' from back of card or info page
						CCH.map.updateFromCookie();
					} else if (zoomToBbox) {
						CCH.map.zoomToBoundingBox({
							bbox: data.bbox,
							fromProjection: CCH.CONFIG.map.modelProjection
						});
					}
				};
				$(window).on('cch.ui.resized', resizeHandler);
				$(window).resize();
				$(window).trigger('cch.item.loaded.all');
				splashUpdate("Starting Application...");
				CCH.ui.removeOverlay();
				$(window).off('cch.app.initialized', CCH.CONFIG.onAppInitialize); // Remove handler
				delete CCH.CONFIG.onAppInitialize; // no longer needed

			}
		});

		new CCH.Objects.Item(data).loadFromData(data);
	});

	new CCH.Util.Search().submitItemSearch({
		item: 'uber',
		subtree: subtree,
		callbacks: {
			'success': callbacks.success,
			'error': callbacks.error
		}
	});
};

CCH.CONFIG.onAppInitialize = function () {
	"use strict";
	//Begins the item loading process based on how the user is entering the application
	var type = (CCH.CONFIG.params.type + String()).toLowerCase(),
		id = CCH.CONFIG.params.id,
		cookieItems = CCH.session.getItems();

	splashUpdate('Loading Application...');

	// Populate the UI with incoming data
	// Decide how to load the application. 
	// Depending on the 'idType' string, the application can be loaded either through:
	// 'ITEM' = Load a single item from the database
	// 'VIEW' = Load a session which can have zero, one or more items
	// '' = Load the application normally through the uber item
	// 
	// Most of the application is now initialized, so I'm going to try and load
	// either one item, a view or all top level items. First I check if idType exists
	if (type) {
		// User is coming in with either an item or a view, check which
		if (type === 'view') {
			splashUpdate("Loading View...");

			// Begin by trying to load the session from the incoming url
			CCH.session.load({
				sid: CCH.CONFIG.params.id,
				callbacks: {
					success: [
						function (session) {
							var items = CCH.session.getSession().items;

							CCH.ui.addItemsToBucketOnLoad(items);

							CCH.CONFIG.loadUberItem({
								zoomToBbox: false,
								subtree: true,
								overridePreviousBbox: true
							});

							var resizeHandler = function () {
								$(window).off('cch.ui.resized', resizeHandler);
								CCH.map.zoomToBoundingBox({
									'bbox': session.bbox,
									'fromProjection': CCH.CONFIG.map.modelProjection
								});
							};
							$(window).on('cch.ui.resized', resizeHandler);
						}
					],
					error: [
						function () {
							// The session couldn't be loaded for whatever reason
							// so just load the top level item and move forward
							CCH.CONFIG.loadUberItem({
								zoomToBbox: true,
								subtree: true,
								overridePreviousBbox: false,
								callbacks: {
									success: [
										function () {
											alertify.error('The Coastal Change Hazards Portal could not find your session.', 6000);
										}
									]
								}
							});
						}
					]
				}
			});
		} else if (type === 'item') {
			// User is coming in with an item, so load that item
			$(window).on('cch.item.loaded.all', function (evt) {
				if (evt.namespace === 'all.item.loaded') {
					var item = CCH.items.getById({id: id});
					if (item) {
						// All items have been loaded and my item exists. Show my item in the accordion.
						$(window).trigger('cch.slide.search.button.click.explore', {
							id: id
						});
						
						// Triggering the explore click above also triggers the basket slider to close. When 
						// the basket slider closes, it may hide all the layers though through testing, sometimes
						// it doesn't. It looks like a timing issue. Adding this hack here ensure that the layer 
						// the user came to see shows up
						CCH.items.getById({id: id}).showLayer();
					} else {
						// The item could not be found. Show an error and wait for the app to resize
						// (happens on loading completetion). When it happens, zoom to the bounding
						// box of the map's initial extent (the continentat US) and then unbind the handler
						alertify.error('The item you\'re looking for could not be found.', 6000);
						var resizeHandler = function () {
							$(window).off('cch.ui.resized', resizeHandler);
							CCH.map.getMap().zoomToExtent(CCH.map.getMap().initialExtent);
						};
						$(window).on('cch.ui.resized', resizeHandler);

					}
				}
			});

			CCH.ui.addItemsToBucketOnLoad(cookieItems);

			CCH.CONFIG.loadUberItem({
				subtree: true,
				zoomToBbox: true,
				overridePreviousBounds: false
			});
		}
	} else {
		// The user is initially loading the application. I do not have any items or views
		// to load, nor do I have any session to load, so just start with the top level item
		CCH.ui.addItemsToBucketOnLoad(cookieItems);

		CCH.CONFIG.loadUberItem({
			subtree: true,
			zoomToBbox: true,
			overridePreviousBounds: false
		});
	}
};

$(window).on('cch.app.initialized', CCH.CONFIG.onAppInitialize);