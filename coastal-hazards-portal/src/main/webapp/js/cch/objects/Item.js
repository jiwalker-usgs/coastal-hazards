/*jslint browser: true*/
/*jslint plusplus: true */
/*global $*/
/*global CCH*/
/*global OpenLayers*/

CCH.Objects.Item = function (args) {
	"use strict";
	args = args || {};

	CCH.LOG.trace('Item.js::init():Item class is initializing.');

	var me = this === window ? {} : this;

	me.UNITED_STATES_BBOX = [24.956, -124.731, 49.372, -66.97];
	me.id = args.id;
	me.parent = args.parent || null;
	me.loaded = args.loaded || false;
	me.ribboned = args.ribboned || args.ribbonable || false; // Data may be coming in with the parameter named "ribboned" or "ribbonable" 
	me.children = args.children || [];
	me.displayedChildren = args.displayedChildren || [];
	me.attr = args.attr || null;
	me.metadata = args.metadata || null;
	me.bbox = args.bbox || me.UNITED_STATES_BBOX;
	me.itemType = args.itemType || null;
	me.name = args.name || null;
	me.summary = args.summary || null;
	me.type = args.type || null;
	me.services = args.services || null;

	me.load = function (args) {
		args = args || {};

		var callbacks = args.callbacks || {},
			subtree = args.subtree || false,
			context = args.context || me;

		callbacks.success = callbacks.success || [];
		callbacks.error = callbacks.error || [];

		callbacks.success.unshift(me.loadFromData);

		CCH.items.search({
			item: me.id,
			displayNotification: false,
			context: context,
			subtree: subtree,
			callbacks: {
				success: callbacks.success,
				error: callbacks.error
			}
		});
	};

	me.loadFromData = function (data) {
		me.children = data.children || [];
		me.displayedChildren = data.displayedChildren || [];
		me.attr = data.attr;
		me.metadata = data.metadata;
		me.ribboned = data.ribbonable;
		me.bbox = data.bbox || me.UNITED_STATES_BBOX;
		me.itemType = data.itemType;
		me.name = data.name;
		me.summary = data.summary;
		me.type = data.type;
		me.services = data.services;

		CCH.items.add({item: me});

		if (me.children.length && !me.loaded) {
			// If I have children, load those as well
			var setLoaded = function (evt, args) {
				if (!me.loaded) {
					var loadedItemIsChild = me.children.findIndex(function (childId) {
						return childId === args.id;
					}) !== -1,
						childItems = [],
						allLoaded;
					if (loadedItemIsChild) {
						me.children.each(function (childId) {
							var childItem = CCH.items.getById({id: childId});
							if (childItem) {
								childItems.push(childItem);
							}
						});

						if (childItems.length === me.children.length) {
							allLoaded = childItems.findIndex(function (childItem) {
								return !childItem.loaded;
							}) === -1;
							if (allLoaded) {
								me.loaded = true;
								CCH.LOG.debug('Item.js::init():Item ' + me.id + ' finished initializing.');
								$(window).trigger('cch.item.loaded', {
									id: me.id
								});
							}
						}
					}
				}
			};

			$(window).on('cch.item.loaded', setLoaded);

			// I make the distinction here whether the item has been loaded completely or did we just get
			// child ids. If the object is loaded completely, I have no more need to make any other calls
			// to the back end so just properly load the children as Item objects 
			if (typeof me.children[0] === 'object') {
				// Set myself to be fully loaded since I have no need to make further async calls
				me.loaded = true;

				var loadDataToItem = function (itemData, parent) {
					var child,
						item;

					itemData.parent = parent;
					itemData.loaded = true;
					item = new CCH.Objects.Item(itemData);

					// For each child, recurse back into this function using my child's data 
					if (itemData.children) {
						for (var i = 0; i < itemData.children.length; i++) {
							child = itemData.children[i];
							loadDataToItem(child, item);
							item.children[i] = child.id;
						}
					}

					CCH.items.add({item: item});

					$(window).trigger('cch.item.loaded', {
						id: item.id
					});
				};

				// Start loading my children by just passing me in
				// I may have a parent but probably don't.
				loadDataToItem(me, null);
			} else {
				// The child still needs to be loaded
				me.children.each(function (child) {
					new CCH.Objects.Item({
						id: child,
						parent: me
					}).load();
				});
			}

		} else {
			me.loaded = true;
			$(window).trigger('cch.item.loaded', {
				id: me.id
			});
			CCH.LOG.debug('Item.js::init():Item ' + me.id + ' finished initializing.');
		}
	};

	me.createWmsLayer = function (args) {
		args = args || {};
		var id = me.id,
			service = me.getService('proxy_wms'),
			endpoint = service.endpoint,
			layers = service.serviceParameter || [],
			bbox = me.bbox,
			itemType = me.itemType,
			sldId = id,
			aggregationId = args.aggregationName,
			layer = null;

		if (itemType !== 'aggregation') {
			
			// If I am a histocial year layer, I'd like to use the id of my parent for the SLD
			// TODO- Uncomment this when we've standardized our layer date attributes
//			if (me.type === 'historical' && me.attr.toLowerCase().indexOf('date') !== -1) {
//				if (aggregationId) {
//					sldId = aggregationId.replace(/_$/, "");
//				}
//			}
			
			layer = new OpenLayers.Layer.WMS(
				id,
				endpoint,
				{
					layers: layers,
					format: 'image/png',
					transparent: true,
					sld: CCH.CONFIG.publicUrl + '/data/sld/' + sldId,
					styles: 'cch',
					version: '1.3.0',
					exceptions: 'application/vnd.ogc.se_blank'
				}, {
					displayOutsideMaxExtent: false,
					projection: 'EPSG:3857',
					isBaseLayer: false,
					displayInLayerSwitcher: false,
					singleTile: me.ribboned || false,
					maxExtent: new OpenLayers.Bounds(bbox).transform(CCH.CONFIG.map.modelProjection, new OpenLayers.Projection('EPSG:3857')),
					bbox: bbox,
					itemid: id,
					transitionEffect: 'map-resize',
					type: 'cch'// CCH specific setting
				}
			);
		}


		return layer;
	};

	me.getLayerList = function (args) {
		args = args || {};
		var index,
			layerName,
			idx,
			child,
			aggregationName = args.aggregationName || '',
			layers = args.layers || [],
			bboxObject = args.bboxObject || {},
			stringifiedBbox = me.bbox.toString(),
			childReturnObj;

		if (me.itemType === 'aggregation') {
			if (aggregationName === '') {
				aggregationName = me.id + '_';
			}
			for (idx = 0; idx < this.displayedChildren.length; idx++) {
				child = CCH.items.getById({id: this.displayedChildren[idx]});
				if (child) {
					childReturnObj = child.getLayerList({
						layers: layers,
						aggregationName: aggregationName,
						bboxObject: bboxObject
					});
					layers.concat(childReturnObj.layers);
					bboxObject = childReturnObj.bboxObject;
				}

			}
		} else {
			if (me.ribboned && me.parent && me.parent.ribboned) {
				index = me.parent.children.findIndex(function (childId) {
					return me.id === childId;
				});
				index += 1;
				if (index > layers.length + 1) {
					index = layers.length + 1;
				}

				if (bboxObject[stringifiedBbox]) {
					index = bboxObject[stringifiedBbox].length + 1;
					bboxObject[stringifiedBbox].push(me.id);
				} else {
					index = 1;
					bboxObject[stringifiedBbox] = [me.id];
				}

				layerName = aggregationName + me.id + '_r_' + index;
			} else {
				layerName = aggregationName + me.id;
			}

			layers.push(layerName);
		}

		return {
			layers: layers,
			bboxObject: bboxObject
		};
	};

	me.showLayer = function (args) {
		args = args || {};
		var index,
			layer,
			idx,
			child,
			layerName,
			aggregationName = args.aggregationName || '',
			visible = args.visible,
			layers = args.layers || [],
			bboxObject = args.bboxObject || {},
			stringifiedBbox = me.bbox.toString(),
			childReturnObj;


		// Check to see if this is an aggregation. If it is, I need
		// to pull the layers from all of its children
		if (this.itemType === 'aggregation') {

			if (aggregationName === '') {
				aggregationName = me.id + '_';
			}

			// This aggregation should have children, so for each 
			// child, I want to grab the child's layer and display it
			// on the map
			for (idx = 0; idx < this.displayedChildren.length; idx++) {
				child = CCH.items.getById({id: this.displayedChildren[idx]});
				if (child) {
					childReturnObj = child.showLayer({
						layers: layers,
						aggregationName: aggregationName,
						bboxObject: bboxObject,
						visible: visible
					});
					layers.concat(childReturnObj.layers);
					bboxObject = childReturnObj.bboxObject;
				}
			}

			// Because I don't have a real layer for this aggregation, once all 
			// of the children are added, I include this trigger so that other
			// components can act on this layer having been added
			$(window).trigger('cch.map.shown.layer', {
				layer: {
					itemid: this.id
				}
			});
		} else {
			layerName = aggregationName + this.id;

			if (me.ribboned && me.parent && me.parent.ribboned) {
				index = me.parent.children.findIndex(function (childId) {
					return me.id === childId;
				});
				index += 1;

				if (index > layers.length + 1) {
					index = layers.length + 1;
				}

				if (bboxObject[stringifiedBbox]) {
					index = bboxObject[stringifiedBbox].length + 1;
					bboxObject[stringifiedBbox].push(me.id);
				} else {
					index = 1;
					bboxObject[stringifiedBbox] = [me.id];
				}

				layerName = aggregationName + me.id + '_r_' + index;
			} else {
				index = 0;
			}

			layer = CCH.map.showLayer({
				item: this,
				ribbon: index,
				visible: visible,
				aggregationName: aggregationName,
				name: layerName
			});
			layers.push(layer);
		}

		return {
			layers: layers,
			bboxObject: bboxObject
		};
	};

	me.hideLayer = function () {
		me.getLayerList().layers.each(function (layerName) {
			CCH.map.hideLayersByName(layerName);
		});

		if (me.itemType === 'aggregation') {
			$(window).trigger('cch.map.hid.layer', {
				layer: {
					itemid: me.id
				}
			});
		}
	};

	/**
	 * Using an item id, this function will run through itself and children to
	 * return an array of item ids that is the path to the item within the children
	 * for this item.
	 * 
	 * This function is typically run through the parent item for an item chain.
	 * 
	 * If the id is not found through the item chain, an empty array is returned.
	 * 
	 * If the id is the parent item, an array of 1 item is returned.
	 * 
	 * If the id is a child down the chain, the array that is returned is an
	 * ordered list of item ids from the parent in the first index to the child 
	 * item that is being looked for in the last index.
	 * 
	 * @param {String} id - The item id that is being looked for.
	 * @param {Array.<string>} path - This param is typically passed in by callers
	 * but an empty Array.<string> also may be passed in or a path up to the item 
	 * being sought
	 */
	me.pathToItem = function (id, path) {
		var idx = 0,
			child;
		path = path || [];

		if (me.id === id) {
			path.unshift(me.id);
		} else {
			if (me.children.length > 0) {
				for (idx; idx < me.children.length && path.length === 0; idx++) {
					child = CCH.items.getItems()[me.children[idx]];
					// Child may not have been loaded so just keep going. This
					// only happens sometimes when I have to drill down initially
					// to an item that may be loaded at the very end of the process.
					// However, if this function is called, it usually means I have 
					// enough information upstream to tell me how to get to the item
					// I'm trying to get to and this is not the correct path anyway
					// so the upstream functionality will end up looking at the 
					// next branch for the item.
					path = child ? child.pathToItem(id, path) : [];
				}

				if (path.length > 0) {
					path.unshift(me.id);
				}
			}
		}
		return path;
	};

	me.getAncestor = function () {
		if (!me.parent || me.parent.id === 'uber') {
			return me;
		}
		return me.parent.getAncestor();
	};

	me.getService = function (type) {
		var defaultServiceObject = {
			endpoint: 'na',
			serviceParameter: 'na',
			type: type
		},
		serviceObject;

		serviceObject = me.services.find(function (service) {
			if (service.type === type) {
				return service;
			}
		});

		return serviceObject || defaultServiceObject;
	};

	CCH.LOG.trace('Item.js::init():Item class finished initializing.');

	return $.extend(me, {
		id: me.id,
		bbox: me.bbox,
		children: me.children,
		itemType: me.itemType,
		getService: me.getService,
		name: me.name,
		summary: me.summary,
		type: me.type,
		getWmsLayer: me.createWmsLayer,
		load: me.load,
		loadFromData: me.loadFromData,
		getLayerList: me.getLayerList,
		showLayer: me.showLayer,
		hideLayer: me.hideLayer,
		pathToItem: me.pathToItem,
		getAncestor: me.getAncestor,
		CLASS_NAME: 'CCH.Objects.Item'
	});
};