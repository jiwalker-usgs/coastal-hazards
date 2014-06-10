/*jslint browser: true */
/*jslint plusplus: true */
/*global $*/
/*global LOG*/
/*global CCH*/
/*global OpenLayers*/
/*global ga*/
window.CCH = CCH || {};
CCH.Objects = CCH.Objects || {};
CCH.Objects.Back = CCH.Objects.Back || {};
CCH.Objects.Back.Map = function (args) {
	"use strict";
	var me = (this === window) ? {} : this;

	me.attributionSource = CCH.CONFIG.contextPath + '/images/openlayers/usgs.svg';
	me.EXTEND_BOUNDS_BY = 0.00;

	me.addLayer = function (layer) {
		CCH.CONFIG.map.addLayer(layer);
	};

	me.addLayers = function (layers) {
		layers = layers || [];
		CCH.CONFIG.map.addLayers(layers);
	};

	me.showLayer = function (args) {
		var card = args.card,
			item = args.item,
			ribbonIndex = args.ribbon || 0,
			layerName = args.name,
			layer;

		layer = CCH.CONFIG.map.getLayersByName(layerName)[0];

		if (!layer) {
			if (card) {
				layer = card.layer;
			} else if (item && 'function' === typeof item.getWmsLayer) {
				layer = item.getWmsLayer(args);
				layer.events.register('loadstart', layer, function () {
					$('div.olMap').css('cursor', 'wait');
					$('body').css('cursor', 'wait');
				});
				layer.events.register('loadend', layer, function () {
					var layers = CCH.CONFIG.map.layers.findAll(function (l) {
						return !l.isBaseLayer;
					}),
						layersStillLoading = 0;

					layers.each(function (l) {
						layersStillLoading += l.numLoadingTiles;
					});

					if (layersStillLoading === 0) {
						$('div.olMap').css('cursor', 'default');
						$('body').css('cursor', 'default');
					}
				});
			}
		}

		if (layer.params.SLD.indexOf('ribbon') === -1 && layerName.indexOf('_r_') !== -1) {
			layer.name = layerName;
			layer.mergeNewParams({
				'SLD': layer.params.SLD + '?ribbon=' + ribbonIndex,
				'buffer': (ribbonIndex - 1) * 6
			});
		}

		CCH.CONFIG.map.addLayer(layer);

		layer.setVisibility(true);

		$(window).trigger('cch.map.shown.layer', {
			layer: layer
		});
		return layer;
	};

	me.buildMap = function () {
		// Buffer the bounds of the layer by 10 degrees in each direction for the 
		// restricted extend
		var originalBounds = new OpenLayers.Bounds(CCH.CONFIG.item.bbox),
			extendedBounds = new OpenLayers.Bounds([
				originalBounds.left - Math.abs(originalBounds.left * me.EXTEND_BOUNDS_BY),
				originalBounds.bottom - Math.abs(originalBounds.bottom * me.EXTEND_BOUNDS_BY),
				originalBounds.right + Math.abs(originalBounds.right * me.EXTEND_BOUNDS_BY),
				originalBounds.top + Math.abs(originalBounds.top * me.EXTEND_BOUNDS_BY)
			]),
			modelProjection = new OpenLayers.Projection('EPSG:4326'),
			mapProjection = new OpenLayers.Projection('EPSG:3857'),
			bounds,
			attributionControl; // We may want to re-enable this later

		originalBounds.extend(extendedBounds);
		bounds = originalBounds.transform(modelProjection, mapProjection);

		CCH.CONFIG.map = new OpenLayers.Map('map', {
			projection: CCH.CONFIG.projection,
			displayProjection: new OpenLayers.Projection(CCH.CONFIG.projection),
			restrictedExtent: bounds,
			tileManager: new CCH.Objects.FixedTileManager()
		});
		
		CCH.CONFIG.map.modelProjection = modelProjection;
		
		CCH.CONFIG.map.addLayer(new OpenLayers.Layer.XYZ("Light Gray Base",
			"http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}",
			{
				sphericalMercator: true,
				isBaseLayer: true,
				numZoomLevels: 17,
				wrapDateLine: true
			}
		));

		attributionControl = new OpenLayers.Control.Attribution({
			'template': '<a id="attribution-link" href="http://www.usgs.gov/"><img id="openlayers-map-attribution-image" src="' + me.attributionSource + '" /></a>'
		});

		CCH.CONFIG.map.zoomToExtent(new OpenLayers.Bounds(CCH.CONFIG.item.bbox).transform(CCH.CONFIG.map.modelProjection, mapProjection));
		CCH.CONFIG.map.addControl(attributionControl);

		$('a').click(function (event) {
			ga('send', 'event', {
				'eventCategory': 'link', // Required.
				'eventAction': 'clicked', // Required.
				'eventLabel': event.target.href
			});
		});
	};

	return me;
};
