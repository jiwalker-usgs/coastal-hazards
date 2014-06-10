/*jslint browser: true */
/*jslint plusplus: true */
/*global $ */
/*global CCH */
/*global OpenLayers */
/*global twttr */
window.CCH = CCH || {};
CCH.Objects = CCH.Objects || {};
CCH.Objects.Back = CCH.Objects.Back || {};
CCH.Objects.Back.UI = function (args) {
	"use strict";
	CCH.LOG.info('UI.js::constructor: UI class is initializing.');

	var me = (this === window) ? {} : this;


	me.init = function (args) {
		var $metadataLinkButton = $('#metadata-link-container'),
			$downloadFullLink = $('#download-full-link-container'),
			$applicationLink = $('#application-link-container'),
			$qrImage = $('#qr-code-img'),
			$infoTitle = $('#info-title'),
			$infoSummary = $('#info-summary'),
			$infoPubListSpan = $('#info-container-publications-list-span'),
			cswService,
			$publist,
			item = args.item;

		// Create a "Back To Portal" link to let the user view this in the portal
		$applicationLink.find('a').attr({
			'href': CCH.CONFIG.contextPath + '/ui/item/' + CCH.CONFIG.itemId
		});

		// Link the "Download Full" button
		$downloadFullLink.find('a').attr({
			'href': window.location.origin + CCH.CONFIG.contextPath + '/data/download/item/' + CCH.CONFIG.itemId
		});


		me.createModalServicesTab({
			item: item
		});

		// Create a "View Metadata" button
		cswService = CCH.CONFIG.item.services.find(function (service) {
			return service.type === 'csw';
		});

		// If item has a metadata service behind it, wire up the button. Otherwise, remove it.
		if (cswService && cswService.endpoint) {
			$metadataLinkButton.find('a').attr({
				'href': cswService.endpoint + '&outputSchema=http://www.opengis.net/cat/csw/csdgm'
			});
		} else {
			$metadataLinkButton.remove();
		}

		// Build the publications list for the item
		if (item.summary.full.publications) {
			$publist = $('<ul />').attr('id', 'info-container-publications-list');
			Object.keys(item.summary.full.publications, function (type) {
				var pubTypeArray = item.summary.full.publications[type],
					pubTypeListHeader = $('<li />').
					addClass('publist-header').
					html(type),
					subList = $('<ul />'),
					pubLink;
				if (pubTypeArray.length) {
					pubTypeListHeader.append(subList);
					$publist.append(pubTypeListHeader);
					item.summary.full.publications[type].each(function (publication) {
						pubLink = $('<a />').attr({
							'href': publication.link,
							'target': 'portal_publication_window'
						}).html(publication.title);
						subList.append($('<li />').append(pubLink));
					});
				}
			});
		} else {
			$('#info-container-publications-list-span').remove();
		}

		$infoTitle.html(item.summary.full.title);
		$qrImage.attr({
			src: CCH.CONFIG.contextPath + '/data/qr/info/item/' + CCH.CONFIG.itemId + '?width=250&height=250'
		});
		$infoSummary.html(item.summary.full.text);
		$infoPubListSpan.append($publist);

		CCH.map.buildMap();

		if (item.getLayerList().layers.length) {
			new CCH.Objects.Widget.Legend({
				containerId: 'info-legend',
				item: item,
				onComplete: function () {
					var $container = this.$container,
						$legendDiv = this.$legendDiv,
						$firstTable = $('#info-legend > div > table:first-child'),
						$captions = $legendDiv.find('table > thead > caption'),
						mapHeight = $('#map').height(),
						tableHeight,
						tableWidth = $firstTable.width();

					// For one reason or another, the caption in the table doesn't seem to dynamically resize
					$captions.width(tableWidth);

					// I don't want my legend div to be taller than the map
					tableHeight = $firstTable.height() - parseInt($container.css('paddingTop'));

					if (tableHeight > mapHeight) {
						tableHeight = mapHeight;
					}

					// Set the height of the container to the height of the first table (All tables should be about
					// the same size)
					$container.height(tableHeight);
				}
			}).init();
		} else {
			me.removeLegendContainer();
		}

		var minificationCallback = function (data) {
			var url = data.tinyUrl || data.responseJSON.full_url,
				$shareInput = $('#modal-share-summary-url-inputbox'),
				$shareButton = $('#view-sharing-container button');

			// Add the url to the input box
			$shareInput.val(url);
			// Highlight the entire input box
			$shareInput.select();
			// Enable the share button
			$shareButton.removeClass('disabled');

			twttr.widgets.createShareButton(
				url,
				$('#twitter-button-span')[0],
				function (element) {
					CCH.LOG.trace('Twitter create share button callback triggered on ' + element);
				},
				{
					hashtags: 'USGS_CCH',
					lang: 'en',
					size: 'large',
					text: CCH.CONFIG.item.summary.tiny.text,
					count: 'none'
				}
			);
			twttr.events.bind('tweet', function () {
				alertify.log('Your view has been tweeted. Thank you.');
			});
		};

		// Build the share modal
		CCH.Util.Util.getMinifiedEndpoint({
			location: CCH.CONFIG.publicUrl + '/ui/info/item/' + CCH.CONFIG.itemId,
			callbacks: {
				success: [minificationCallback],
				error: [minificationCallback]
			}
		});

		return me;
	};


	me.removeLegendContainer = function () {
		$('#info-legend').remove();
	};

	me.createModalServicesTab = function (args) {
		var item = args.item,
			$container = args.container || $('#modal-services-view .modal-body'),
			$tabUl = $container.find('> ul'),
			$tabContentContainer = $container.find('> div'),
			$tabLi = $('<li />'),
			$tabLink = $('<a />').
			attr({
				'data-toggle': 'tab',
				'href': '#tab-' + item.id
			}).html(item.summary.tiny.text),
			$tabBody = $('<div />').
			addClass('tab-pane').
			attr('id', 'tab-' + item.id);

		if ($tabUl.length === 0) {
			$tabUl = $('<ul />').addClass('nav nav-tabs');
			$tabContentContainer = $('<div />').addClass('tab-content');
			$container.append($tabUl, $tabContentContainer);
		}

		if ($tabUl.children().length === 0) {
			$tabLi.addClass('active');
			$tabBody.addClass('active');
		}

		$tabLi.append($tabLink);
		$tabUl.append($tabLi);
		$tabContentContainer.append($tabBody);

		if (item.children.length !== 0) {
			item.children.each(function (childId) {
				var child = CCH.items.getById({id: childId});
				me.createModalServicesTab({
					item: child,
					container: $tabBody
				});
			});
		} else {
			item.services.each(function (service) {
				var endpoint = service.endpoint,
					serviceType = service.type,
					serviceParam = service.serviceParameter,
					$link = $('<a />').attr({
					'href': endpoint,
					'target': '_services'
				}),
					$textBox = $('<input />').attr({
					'type': 'text'
				}),
					$serviceParamSpan = $('<span />').html(' (Service Parameter: '),
					$newRow = $('<div />').
					addClass('row').
					append($link);

				switch (serviceType) {
					case ('csw') :
						{
							$link.html('CSW :');
							$textBox.val(endpoint);
							$newRow.append($link, $textBox);
							break;
						}
					case ('source_wms') :
						{
							$link.html('Source WMS :');
							$textBox.val(endpoint);
							$serviceParamSpan.append(serviceParam, ' )');
							$newRow.append($link, $serviceParamSpan, $textBox);
							break;
						}
					case ('source_wfs') :
						{
							$link.html('Source WFS :');
							$textBox.val(endpoint);
							$serviceParamSpan.append(serviceParam, ' )');
							$newRow.append($link, $serviceParamSpan, $textBox);
							break;
						}
					case ('proxy_wfs') :
						{
							$link.html('Proxy WFS :');
							$textBox.val(endpoint);
							$serviceParamSpan.append(serviceParam, ' )');
							$newRow.append($link, $serviceParamSpan, $textBox);
							break;
						}
					case ('proxy_wms') :
						{
							$link.html('Proxy WMS :');
							$textBox.val(endpoint);
							$serviceParamSpan.append(serviceParam, ' )');
							$newRow.append($link, $serviceParamSpan, $textBox);
							break;
						}
				}
				$tabBody.append($newRow);
			});
		}
	};



	return me.init(args);
};
