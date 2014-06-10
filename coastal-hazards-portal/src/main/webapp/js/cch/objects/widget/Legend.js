/*jslint browser: true*/
/*jslint plusplus: true */
/*global $*/
/*global LOG*/
/*global CCH*/

window.CCH = CCH || {};
CCH.Objects = CCH.Objects || {};
CCH.Objects.Widget = CCH.Objects.Widget || {};
CCH.Objects.Widget.Legend = function (args) {
	"use strict";
	var me = (this === window) ? {} : this;
	$.extend(true, me, args);
	me.errorMessage = 'Legend.js:: %s Legend could not be created.';
	me.$container = null;
	me.$legendDiv = $('<div />').html('Loading...');
	me.items = [];
	me.itemTypes = new CCH.Objects.Items().Types;
	me.owsUtils = new CCH.Util.OWS();
	// If available, this class is added to $legendDiv
	me.legendClass = args.legendClass;
	// I keep track of ongoing ajax requests. When I destroy this object
	me.ajaxRequests = [];
	// A flag that informs any ongoing processes in this object whether or not the object has already been destroyed.
	// There are edge cases where the application may not want the ajax calls from this object to complete and if
	// this gets flipped to true, I want to stop all processes as soon as possible
	me.destroyed = false;
	me.init = function () {
		CCH.LOG.trace('Legend.js::constructor:Legend class is initializing.');
		me.$container = $('#' + me.containerId);
		me.$container.append(me.$legendDiv);
		if (me.$container.length === 0) {
			throw me.errorMessage.replace('%s', 'containerId  "' + me.containerId + '" not found in document.');
		}

		if (me.legendClass) {
			me.$legendDiv.addClass(me.legendClass);
		}

		me.generateLegend({
			item: me.item
		});

		return me;
	};
	
	me.generateLegend = function (args) {
		args = args || {};
		var item = args.item,
			itemType = item.type;

		if (itemType === me.itemTypes.HISTORICAL) {
			me.generateHistoricalLegendTables({
				item: item
			});
		}
		else if (itemType === me.itemTypes.STORMS) {
			me.generateStormLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.VULNERABILITY) {
			me.generateVulnerabilityLegendTables({
				item: item
			});
		} else if (itemType === me.itemTypes.MIXED) {
			me.generateMixedLegendTables({
				item: item
			});
		} else {
			me.hide();
		}

		return me;
	};
	
	me.generateGenericLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			$table = $('<table />'),
			$thead = $('<thead />'),
			$caption = $('<caption />'),
			$theadTr = $('<tr />'),
			$theadUOM = $('<td />'),
			$colorContainer,
			$tr,
			$colorTd,
			$rangeTd,
			bins = sld.bins,
			uom = sld.units || '',
			title = sld.title || '',
			upperBound,
			lowerBound,
			category,
			years,
			color,
			range;
		// Create the table head which displays the unit of measurements
		$caption.html(title);
		$theadUOM.html(uom);
		$theadTr.append($('<td />'), $theadUOM);
		$thead.append($theadTr);
		$table.append($caption, $thead);
		bins.each(function (bin) {
			$tr = $('<tr />');
			$colorTd = $('<td />');
			$rangeTd = $('<td />');
			$colorContainer = $('<span />');
			upperBound = bin.upperBound;
			lowerBound = bin.lowerBound;
			years = bin.years;
			category = bin.category;
			color = bin.color;
			range = null;

			if (bin.category) {
				range = category;
			} else if (bin.years) {
				range = years;
			} else {
				range = me.generateRangeString(upperBound, lowerBound);
			}

			$colorContainer.attr('style', 'background-color:' + color + ' !important');
			$colorTd.append($colorContainer);
			$rangeTd.html(range);
			$tr.append($colorTd, $rangeTd);
			$table.append($tr);
		});
		return $table;
	};

	me.generateMixedLegendTables = function (args) {
		args = args || {};
		var item = args.item,
			childItems;
		if ('aggregation' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateMixedLegendTable
		});
	};

	me.generateMixedLegendTable = function (args) {
		args = args || {};
		var item = args.item,
			$legendTable,
			attr = item.attr,
			index = args.index || null,
			sld = args.sld;


		$legendTable = me.generateGenericLegendTable({
			sld: sld
		});

		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});

		return $legendTable;
	};

	me.generateHistoricalLegendTables = function (args) {
		args = args || {};
		var item = args.item,
			childItemIdArray,
			dataItem,
			isYearAggregation;

		if ('aggregation' === item.itemType.toLowerCase()) {
			childItemIdArray = me.getAggregationChildrenIds(item.id);

			// Figure out if this is a date-type historical aggregation. If so, I'll have to stitch together the year 
			// array
			dataItem = function (items) {
				var dataItemId = items.find(function (id) {
					return CCH.items.getById({id: id}).itemType === 'data';
				});

				return CCH.items.getById({id: dataItemId});
			}(childItemIdArray);

			// Because this is an aggregation of dates, I want to only use the top level aggregation item 
			// because that SLD will hold all of the dates necessary. The back-end service inserts all of the dates
			// and color maps that the aggregation contains for its children
			isYearAggregation = dataItem.attr.toLowerCase().indexOf('date') !== -1;
			if (isYearAggregation) {
				childItemIdArray = [item.id];
			}
		} else {
			childItemIdArray = [item.id];
		}

		me.createLegendsFromItems({
			items: childItemIdArray,
			tableAddedCallback: null,
			generateLegendTable: me.generateHistoricalLegendTable
		});
	};

	me.generateHistoricalLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			item = args.item,
			attr = item.attr,
			index = args.index || null,
			$legendTable,
			$legendTableTBody,
			$yearRows;

		$legendTable = me.generateGenericLegendTable({
			sld: sld
		});

		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});

		// If the table is a date table, I want to sort it by year in descending order
		if ('year' === sld.units) {
			$legendTableTBody = $legendTable.find('tbody');
			$yearRows = $legendTableTBody.find('tr').toArray();
			$yearRows = $yearRows.sortBy(function (r) {
				return parseInt($(r).find('td:nth-child(2)').html(), 10);
			}).reverse();
			$legendTableTBody.empty().append($yearRows);
		}

		return $legendTable;
	};

	me.generateStormLegendTables = function (args) {
		args = args || {};
		var item = args.item,
			childItems;

		if ('aggregation' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateStormLegendTable
		});
	};

	me.generateStormLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			item = args.item,
			index = args.index,
			attr = item.attr,
			$legendTable = me.generateGenericLegendTable({
				sld: sld
			});
		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});
		return $legendTable;
	};

	me.generateVulnerabilityLegendTables = function (args) {
		args = args || {};
		var item = args.item,
			childItems;
		if ('aggregation' === item.itemType.toLowerCase()) {
			childItems = me.getAggregationChildrenIds(item.id);
		} else {
			childItems = [item.id];
		}

		me.createLegendsFromItems({
			items: childItems,
			generateLegendTable: me.generateVulnerabilityLegendTable
		});
	};

	me.generateVulnerabilityLegendTable = function (args) {
		args = args || {};
		var sld = args.sld,
			item = args.item,
			index = args.index,
			attr = item.attr,
			$legendTable = me.generateGenericLegendTable({
				sld: sld
			});
		$legendTable.attr({
			'legend-attribute': attr,
			'legend-index': index,
			'legend-item-id': item.id
		});
		return $legendTable;
	};

	me.createLegendsFromItems = function (args) {
		args = args || {};
		var items = args.items,
			xhrRequest,
			legendTables = [],
			generateLegendTable = args.generateLegendTable,
			tableAddedCallback = args.tableAddedCallback;
		items.each(function (childId, index, allItems) {
			if (!me.destroyed) {
				xhrRequest = CCH.Util.Util.getSLD({
					contextPath: CCH.CONFIG.contextPath,
					itemId: childId,
					context: {
						index: index,
						allItems: allItems,
						legendTables: legendTables,
						itemId: childId,
						tableAddedCallback: tableAddedCallback,
						generateLegendTable: generateLegendTable
					},
					callbacks: {
						success: [
							function (sld) {
								var $legendTable = -1,
									index = this.index,
									allItems = this.allItems,
									itemId = this.itemId,
									legendTables = this.legendTables,
									total = allItems.length,
									item = null,
									tableAddedCallback = this.tableAddedCallback || me.tableAdded;
								try {
									item = CCH.items.getById({id: itemId});
									$legendTable = this.generateLegendTable.call(me, {
										sld: sld,
										item: item,
										index: index
									});

									// If the procedure didn't create anything for whatever reason, 
									// set the variable to -1
									if (!$legendTable) {
										$legendTable = -1;
									}
								} catch (ex) {
									// Something went wrong but I don't want to error out, so just 
									// warn, keep the variable at -1 and move on
									LOG.warn(ex);
								}

								// Whatever we have at this point, add it to the array
								legendTables.push($legendTable);

								// And call the table added callback to possibly complete the legend
								tableAddedCallback.call(me, {
									legendTables: this.legendTables,
									total: total,
									item: CCH.items.getById({id: itemId}),
									sld: sld
								});
							}
						],
						error: [
							function () {
								if (!me.destroyed) {
									LOG.warn("Could not retrieve SLD. Legend will not be created for this item");
									this.legendTables.push(-1);
									me.tableAdded({
										legendTables: this.legendTables,
										total: this.total
									});
									if (me.onError) {
										me.onError.call(me, arguments);
									}
								}
							}
						]
					}
				});
				me.ajaxRequests.push(xhrRequest);
			}
		});
	};

	/**
	 * Returns an array if item ids that are visible children of an aggregation
	 * 
	 * @param {String} itemId
	 * @returns {CCH.Objects.Widget.getAggregationChildrenIds.items|Array}
	 */
	me.getAggregationChildrenIds = function (itemId) {
		var item = CCH.items.getById({id: itemId}),
			childLayers = item.getLayerList(),
			items = [];
		childLayers.layers.each(function (layerName) {
			// Possible formats:
			// aggregationId_itemId_r_ribbonIndexInteger (Ribboned, example: C68abcd_C67pzz9_r_1)
			// aggregationId_itemId (Unribboned, example: C68abcd_C67pzz9)
			items.push(layerName.split('_')[1]);
		});
		return items;
	};
	me.generateRangeString = function (ub, lb) {
		if (lb && ub) {
			return lb + ' to ' + ub;
		} else if (lb && !ub) {
			return '> ' + lb;
		} else if (!lb && ub) {
			return '< ' + ub;
		}
		return '';
	};
	me.tableAdded = function (args) {
		args = args || {};
		var total = args.total,
			legendTables = args.legendTables,
			item = args.item || null,
			ribboned = me.item.ribboned  || false,
			legendGroups,
			legendGroup,
			firstLegend,
			firstLegendCaptionText,
			currentLegend,
			currentLegendCaptionText,
			hashKey,
			tableIndex,
			lIdx,
			indexCompare = function (t) {
				return $(t).attr('legend-index') === currentLegend.attr('legend-index');
			};

		// All legend tables have been attained so now I need to actually slice and dice the collection of tables into
		// a nicely formatted single or set of legend tables
		if (legendTables.length === total) {

			// If I am ribboned, I want to group my legends if they're the same color range/measures
			legendGroups = legendTables.groupBy(function (lt) {
				return $(lt).find('tbody').html().hashCode();
			});

			for (hashKey in legendGroups) {
				if (legendGroups.hasOwnProperty(hashKey)) {
					// Sort the legend group by the table's legend index attribtue
					legendGroup = legendGroups[hashKey].sortBy(function (table) {
						return parseInt($(table).attr('legend-index'));
					});
					
					firstLegend = legendGroup[0];
					for (lIdx = 1; lIdx < legendGroup.length; lIdx++) {
						currentLegend = legendGroup[lIdx];
						if (ribboned) {
							firstLegendCaptionText = firstLegend.find('caption').html();
							currentLegendCaptionText = currentLegend.find('caption').html();
							firstLegend.find('caption').html(firstLegendCaptionText + '<br /> ' + currentLegendCaptionText);
						}
						tableIndex = legendTables.findIndex(indexCompare);
						legendTables[tableIndex] = -1;
					}
					
					if (!ribboned) {
						firstLegend.find('caption').html(me.item.summary.tiny.text);
					}
					
				}
			}

			legendTables = legendTables.filter(function (table) { // Remove any array items that are -1
				return table !== -1;
			});

			total = legendTables.length;

			// When all the tables are created, I want to sort them, append them to a  wrapper and throw that wrapper 
			// into the final container
			// There are no more legends to be built, filter and add the legend to the document
			legendTables = legendTables.filter(function (table) { // Remove any array items that are -1
				return table !== -1;
			}).unique(function (table) {
				return $(table).attr('legend-attribute');
			});
			
			if (legendTables.length === 0) {
				// Remove the container and hyst run the onComplete
				me.hide();
			} else {
				// There were tables, so I want to show them
				if (legendTables.length === 1 && total > 1) {
					// I have one table left after running unique(). However, I started out with multiple tables. This
					// means that the title of this table will be the last table to make it through unique(). If that's the 
					// case, use the title of the parent aggregation for this item
					legendTables[0].find('caption').html(item.getAncestor().summary.full.title);
				} else {
					// If there's multiple tables, sort them according to index, leaving
					// titles as is
					legendTables = legendTables.sort(function (a, b) {
						return parseInt($(a).attr('legend-index')) - parseInt($(b).attr('legend-index'));
					});
				}

				// Remove the loading text from the legend div and append the legend tables
				me.$legendDiv.empty().append(legendTables);
			}

			if (me.onComplete) {
				me.onComplete.call(me);
			}

		}
	};
	/**
	 * Hides the legend div
	 * 
	 * @returns {$} the jQuery dom container for this legend
	 */
	me.hide = function () {
		me.$legendDiv.addClass('hidden');
		return me.$legendDiv;
	};
	/**
	 * Shows the legend div
	 * 
	 * @returns {$} the jQuery dom container for this legend
	 */
	me.show = function () {
		me.$legendDiv.removeClass('hidden');
		return me.$legendDiv;
	};
	/**
	 * Marks this widget as being destroyed. Cancels all outgoing ajax requests and removes its container
	 * 
	 * @returns {CCH.Objects.Widget.Legend.me|@exp;CCH@pro;Objects@pro;Widget|CCH.Objects.Widget}
	 */
	me.destroy = function () {
		me.destroyed = true;
		me.ajaxRequests.each(function (req) {
			req.abort();
		});
		me.$legendDiv.remove();
		return me;
	};
	// Verify that everything we need was passed in and create the item. Otherwise, error out.
	if (!me.containerId) {
		throw me.errorMessage.replace('%s', 'Argument "containerId" was not provided.');
	} else if (!me.item) {
		throw me.errorMessage.replace('%s', 'Argument "item" was not provided.');
	} else {
		return {
			init: me.init
		};
	}

};
