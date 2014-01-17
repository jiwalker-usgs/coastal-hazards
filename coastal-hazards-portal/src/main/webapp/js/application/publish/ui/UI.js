/*jslint browser: true*/
/*jslint plusplus: true */
/*global $*/
/*global LOG*/
/*global CCH*/
/*global qq*/
CCH.Objects.UI = function () {
    "use strict";

    CCH.LOG.info('UI.js::constructor: UI class is initializing.');

    var me = (this === window) ? {} : this,
        $form = $('form'),
        $itemIdInput = $form.find('#form-publish-item-id'),
        $titleFullTextArea = $form.find('#form-publish-item-title-full'),
        $titleMediumTextArea = $form.find('#form-publish-item-title-medium'),
        $titleTinyTextArea = $form.find('#form-publish-item-title-tiny'),
        $descriptionFullTextArea = $form.find('#form-publish-item-description-full'),
        $descriptionMediumTextArea = $form.find('#form-publish-item-description-medium'),
        $descriptionTinyTextArea = $form.find('#form-publish-item-description-tiny'),
        $bboxNorth = $form.find('#form-publish-item-bbox-input-north'),
        $bboxWest = $form.find('#form-publish-item-bbox-input-west'),
        $bboxSouth = $form.find('#form-publish-item-bbox-input-south'),
        $bboxEast = $form.find('#form-publish-item-bbox-input-east'),
        $type = $form.find('#form-publish-item-type'),
        $attributeSelect = $form.find('#form-publish-item-attribute'),
        $keywordGroup = $form.find('.form-group-keyword'),
        $cswServiceInput = $form.find('#form-publish-item-service-csw'),
        $srcWfsServiceInput = $form.find('#form-publish-item-service-source-wfs'),
        $srcWfsServiceParamInput = $form.find('#form-publish-item-service-source-wfs-serviceparam'),
        $srcWmsServiceInput = $form.find('#form-publish-item-service-source-wms'),
        $srcWmsServiceParamInput = $form.find('#form-publish-item-service-source-wms-serviceparam'),
        $proxyWfsServiceInput = $form.find('#form-publish-item-service-proxy-wfs'),
        $proxyWfsServiceParamInput = $form.find('#form-publish-item-service-proxy-wfs-serviceparam'),
        $proxyWmsServiceInput = $form.find('#form-publish-item-service-proxy-wms'),
        $proxyWmsServiceParamInput = $form.find('#form-publish-item-service-proxy-wms-serviceparam'),
        $publicationsPanel = $form.find('#publications-panel'),
        $ribbonableCb = $form.find('#form-publish-item-ribbonable'),
        $itemType = $form.find('#form-publish-info-item-itemtype'),
        $name = $form.find('#form-publish-item-name'),
		$displayedChildrenSb = $form.find('#form-publish-item-displayed-children'),
        $wfsImportButton = $form.find('#form-publish-item-service-source-wfs-import-button'),
        $keywordGroupClone = $keywordGroup.clone(),
        $childrenSb = $form.find('#form-publish-item-children'),
		$alertModal = $('#alert-modal'),
		$alertModalTitle = $alertModal.find('.modal-title'),
		$alertModalBody = $alertModal.find('.modal-body'),
		$alertModalFooter = $alertModal.find('.modal-footer');

    $keywordGroup.find('input').removeAttr('disabled');
    $keywordGroup.find('button:nth-child(2)').addClass('hidden');
    $keywordGroup.find('button').removeAttr('disabled');
    $keywordGroup.find('button').on('click', function () {
        if ($keywordGroup.find('input').val() !== '') {
            me.addKeywordGroup($keywordGroup.find('input').val());
        }
    });
	
	$alertModal.on('hidden.bs.modal', function () {
		$alertModalTitle.empty();
		$alertModalBody.empty();
		$alertModalFooter.find('button').not('#alert-modal-close-button').remove();
	});
	
	$attributeSelect.on('select', function (evt) {
		debugger
	});
    
    me.clearForm = function () {
        $titleFullTextArea.attr('disabled', 'disabled');
        $titleMediumTextArea.attr('disabled', 'disabled');
        $titleTinyTextArea.attr('disabled', 'disabled');
        $descriptionFullTextArea.attr('disabled', 'disabled');
        $descriptionMediumTextArea.attr('disabled', 'disabled');
        $descriptionTinyTextArea.attr('disabled', 'disabled');
        $bboxNorth.attr('disabled', 'disabled');
        $bboxWest.attr('disabled', 'disabled');
        $bboxSouth.attr('disabled', 'disabled');
        $bboxEast.attr('disabled', 'disabled');
        $type.attr('disabled', 'disabled');
        $attributeSelect.attr('disabled', 'disabled');
        $('.form-group-keyword input').attr('disabled', 'disabled');
        $srcWfsServiceInput.attr('disabled', 'disabled');
        $srcWfsServiceParamInput.attr('disabled', 'disabled');
        $srcWmsServiceInput.attr('disabled', 'disabled');
        $srcWmsServiceParamInput.attr('disabled', 'disabled');
        $proxyWfsServiceInput.attr('disabled', 'disabled');
        $proxyWfsServiceParamInput.attr('disabled', 'disabled');
        $proxyWmsServiceInput.attr('disabled', 'disabled');
        $proxyWmsServiceParamInput.attr('disabled', 'disabled');
        $ribbonableCb.attr('disabled', 'disabled');
        $itemType.attr('disabled', 'disabled');
        $name.attr('disabled', 'disabled');
		$displayedChildrenSb.attr('disabled', 'disabled');
        $wfsImportButton.attr('disabled', 'disabled');
        $publicationsPanel.find('#form-publish-info-item-panel-publications-button-add').attr('disabled', 'disabled');
        $itemIdInput.val('');
        $titleFullTextArea.val('');
        $titleMediumTextArea.val('');
        $titleTinyTextArea.val('');
        $descriptionFullTextArea.val('');
        $descriptionMediumTextArea.val('');
        $descriptionTinyTextArea.val('');
        $bboxNorth.val('');
        $bboxWest.val('');
        $bboxSouth.val('');
        $bboxEast.val('');
        $type.val('');
        $attributeSelect.val('');
        $('.form-group-keyword').not(':first').remove();
        $('.form-group-keyword button:nth-child(2)').removeClass('hidden');
        $('.form-group-keyword input').val('');
        $cswServiceInput.val('');
        $srcWfsServiceInput.val('');
        $srcWfsServiceParamInput.val('');
        $srcWmsServiceInput.val('');
        $srcWmsServiceParamInput.val('');
        $proxyWfsServiceInput.val('');
        $proxyWfsServiceParamInput.val('');
        $proxyWmsServiceInput.val('');
        $proxyWmsServiceParamInput.val('');
        $publicationsPanel.find('.panel-body').empty();
        $ribbonableCb.prop('checked', false);
        $itemType.val('');
        $name.val('');
        $childrenSb.empty();
		$displayedChildrenSb.empty();
        CCH.items.each(function (cchItem) {
            var option = $('<option />').
                attr('value', cchItem.id).
                html(cchItem.summary.tiny.text);
            $childrenSb.append(option);
        });
    };

    me.enableNewItemForm = function () {
        $titleFullTextArea.removeAttr('disabled');
        $titleMediumTextArea.removeAttr('disabled');
        $titleTinyTextArea.removeAttr('disabled');
        $descriptionFullTextArea.removeAttr('disabled');
        $descriptionMediumTextArea.removeAttr('disabled');
        $descriptionTinyTextArea.removeAttr('disabled');
        $bboxNorth.removeAttr('disabled');
        $bboxWest.removeAttr('disabled');
        $bboxSouth.removeAttr('disabled');
        $bboxEast.removeAttr('disabled');
        $type.removeAttr('disabled');
        $attributeSelect.removeAttr('disabled');
        $('.form-group-keyword input').removeAttr('disabled');
        $srcWfsServiceInput.removeAttr('disabled');
        $srcWfsServiceParamInput.removeAttr('disabled');
        $srcWmsServiceInput.removeAttr('disabled');
        $srcWmsServiceParamInput.removeAttr('disabled');
        $proxyWfsServiceInput.removeAttr('disabled');
        $proxyWfsServiceParamInput.removeAttr('disabled');
        $proxyWmsServiceInput.removeAttr('disabled');
        $proxyWmsServiceParamInput.removeAttr('disabled');
        $ribbonableCb.removeAttr('disabled');
        $itemType.removeAttr('disabled');
        $name.removeAttr('disabled');
        $publicationsPanel.find('#form-publish-info-item-panel-publications-button-add').removeAttr('disabled');
        $('#qq-uploader-dummy').removeClass('hidden');
    };

    me.enableNewAggregationForm = function () {
        $('#qq-uploader-dummy').empty().addClass('hidden');
        $titleFullTextArea.removeAttr('disabled');
        $titleMediumTextArea.removeAttr('disabled');
        $titleTinyTextArea.removeAttr('disabled');
        $descriptionFullTextArea.removeAttr('disabled');
        $descriptionMediumTextArea.removeAttr('disabled');
        $descriptionTinyTextArea.removeAttr('disabled');
        $bboxNorth.removeAttr('disabled');
        $bboxWest.removeAttr('disabled');
        $bboxSouth.removeAttr('disabled');
        $bboxEast.removeAttr('disabled');
        $srcWfsServiceInput.attr('disabled', 'disabled');
        $srcWfsServiceParamInput.attr('disabled', 'disabled');
        $srcWmsServiceInput.attr('disabled', 'disabled');
        $srcWmsServiceParamInput.attr('disabled', 'disabled');
        $proxyWfsServiceInput.attr('disabled', 'disabled');
        $proxyWfsServiceParamInput.attr('disabled', 'disabled');
        $proxyWmsServiceInput.attr('disabled', 'disabled');
        $proxyWmsServiceParamInput.attr('disabled', 'disabled');
        $type.removeAttr('disabled');
        $('.form-group-keyword input').find('#form-publish-info-item-panel-publications-button-add').removeAttr('disabled');
        $ribbonableCb.removeAttr('disabled');
        $itemType.removeAttr('disabled');
        $name.removeAttr('disabled');
        $publicationsPanel.removeAttr('disabled');
        $childrenSb.removeAttr('disabled');
		$displayedChildrenSb.removeAttr('disabled');
    };

    me.initUploader = function (args) {
        args = args || {};
        var button = args.button,
            callbacks = args.callbacks || {
                success : [],
                error : []
            },
            qqUploader;

        qqUploader = new qq.FineUploader({
            element: button,
            autoUpload: true,
            paramsInBody: false,
            forceMultipart: false,
            request: {
                endpoint: CCH.CONFIG.contextPath + '/data/metadata/'
            },
            validation: {
                allowedExtensions: ['xml'],
                sizeLimit: 15728640
            },
            callbacks: {
                onComplete: function (id, fileName, responseJSON) {
                    if (responseJSON.success) {
                        callbacks.success.each(function (cb) {
                            cb({
                                token : responseJSON.fid,
                                id: id,
                                fileName : fileName,
                                responseJSON : responseJSON
                            });
                        });
                    } else {
                        callbacks.error.each(function (cb) {
                            cb({
                                token : responseJSON.fid,
                                id: id,
                                fileName : fileName,
                                responseJSON : responseJSON
                            });
                        });
                    }
                }
            }
        });
        $('#qq-uploader-dummy').css('display', 'inline-block');
        $('.qq-upload-button').find('> div').html('Upload Metadata');
        $(button).click();
        return qqUploader;
    };

    me.createUploader = function (args) {
        // Set the URL to not have an item ID in it
        history.pushState(null, 'New Item', CCH.CONFIG.contextPath + '/publish/item/');
        me.initUploader({
            button : document.getElementById('qq-uploader-dummy'),
            callbacks : args.callbacks
        });
    };

    me.bindKeywordGroup = function ($grp) {
        $grp.find('button').
            on('click', function () {
                if ($form.find('.form-group-keyword').length > 1) {
                    // This is the last keyword group, so don't remove it
                    $grp.remove();
                }
            });
        $grp.find('input').
            on({
                'focusout' : function (evt) {
                    if (evt.target.value === '') {
                        $grp.remove();
                    }
                }
            });
    };

    me.addKeywordGroup = function (keyword) {
        var keywordExists,
            $keywordGroupLocal;
        // Figure out if this keyword would be doubled by adding it
        keywordExists = $form.
            find('.form-group-keyword input').
            not(':first').
            toArray().
            count(function (input) {
                return $(input).val().trim() === keyword.trim();
            }) > 0;

        if (!keywordExists) {
            $keywordGroupLocal = $keywordGroupClone.clone();
            $keywordGroupLocal.find('input').removeAttr('disabled');
            $keywordGroupLocal.find('button:nth-child(1)').addClass('hidden');
            $keywordGroupLocal.find('button').removeAttr('disabled');
            $keywordGroupLocal.
                    find('input').
                    attr('value', keyword);
            me.bindKeywordGroup($keywordGroupLocal);
            $keywordGroup.after($keywordGroupLocal);
        }
    };

    me.initNewItemForm = function () {
        var cswUrl = $('#form-publish-item-service-csw').val();

        me.clearForm();
        me.enableNewItemForm();

        $('#form-publish-item-service-csw').val(cswUrl);

        me.getCSWInfo({
            url : cswUrl,
            callbacks : {
                success : [
                    function (responseObject, textStatus) {
                        if (textStatus === 'success') {
                            var cswNodes = responseObject.children,
                                tag;
                            cswNodes[0].children.each(function (node) {
                                tag = node.tag;
                                switch (tag) {
                                case 'idinfo':
                                    node.children.each(function (childNode) {
                                        tag = childNode.tag;
                                        switch (tag) {
                                        case 'spdom':
                                            childNode.children[0].children.each(function (spdom) {
                                                var direction = spdom.tag.substring(0, spdom.tag.length - 2);
                                                $('#form-publish-item-bbox-input-' + direction).val(spdom.text);
                                            });
                                            break;
                                        case 'keywords':
                                            childNode.children.each(function (kwNode) {
                                                var keywords = kwNode.children;
                                                keywords.splice(1).each(function (kwObject) {
                                                    var keyword = kwObject.text;
                                                    me.addKeywordGroup(keyword);
                                                });
                                            });
                                            break;
                                        }
                                    });
                                    break;
                                }
                            });
                        }
                    }
                ],
                error : [
                    function () {
                        debugger;
                    }
                ]
            }
        });
    };

    me.getCSWInfo = function (args) {
        args = args || {};

        var callbacks = args.callbacks || {
            success : [],
            error : []
        },
            cswURL = args.url,
            url = CCH.CONFIG.contextPath + '/csw/' +
            cswURL.substring(cswURL.indexOf('?')) +
            '&outputFormat=application/json';

        $.ajax({
            url: url,
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            success: function (json, textStatus, jqXHR) {
                callbacks.success.each(function (cb) {
                    cb(json, textStatus, jqXHR);
                });
            },
            error : function () {
                callbacks.error.each(function (cb) {
                    cb();
                });
            }
        });
    };
    
    $('#form-publish-info-item-panel-publications-button-add').on('click', function () {
        me.createPublicationRow('','');
    });

    $('#publish-button-create-aggregation-option').on('click', function () {
        me.clearForm();
        me.enableNewAggregationForm();
    });

    $('#publish-button-create-item-option').on('click', function () {
        me.clearForm();
        $('#qq-uploader-dummy').removeClass('hidden');
        me.createUploader({
            callbacks : {
                success : [
                    function (args) {
                        if (args.responseJSON && args.responseJSON.success === 'true') {
                            me.publishMetadata({
                                token : args.token,
                                callbacks : {
                                    success : [
                                        function (mdObject, status) {
                                            if (status === 'success') {
                                                $('#form-publish-info-item-itemtype').val('data');
                                                $('#form-publish-item-service-csw').val(mdObject.metadata);
                                                me.initNewItemForm();
                                            }
                                        }
                                    ],
                                    error : [
                                        function () {
                                            debugger;
                                        }
                                    ]
                                }
                            });
                        }
                    }
                ],
                error : [
                    function () {
                        debugger;
                    }
                ]
            }
        });
    });

    me.publishMetadata = function (args) {
        args = args || {};
        var token = args.token,
            callbacks = args.callbacks || {
                success: [],
                error: []
            };

        $.ajax({
            url: CCH.CONFIG.contextPath + '/publish/metadata/' + token,
            type: 'POST',
            dataType: 'json',
            success: function (json, textStatus, jqXHR) {
                if (callbacks.success && callbacks.success.length > 0) {
                    callbacks.success.each(function (callback) {
                        callback.call(null, json, textStatus, jqXHR);
                    });
                }
            },
            error: function (xhr, status, error) {
                if (callbacks.error && callbacks.error.length > 0) {
                    callbacks.error.each(function (callback) {
                        callback.call(null, xhr, status, error);
                    });
                }
            }
        });
    };

    me.addUserInformationToForm = function (args) {
        args = args || {};
        var user = args.data || CCH.CONFIG.user,
            firstName = user.firstName + ' ',
            lastName = user.lastName + ' ',
            email = '(' + user.email + ')',
            $container = $('.container'),
            $panetTitle = $container.find('> div > div > h3');

        $panetTitle.append('Welcome, ', firstName, lastName, email, '.');
    };
    
    me.updateSelectAttribtue = function (responseObject) {
        var featureTypes = responseObject.featureTypes,
                $option,
                ftName,
                ftNameLower;
        
        $attributeSelect.empty();
        
        if (featureTypes) {
            featureTypes = featureTypes[0];
            featureTypes.properties.each(function(ft) {
                ftName = ft.name,
                        ftNameLower = ftName.toLowerCase();
                if (ftNameLower !== 'objectid' &&
                        ftNameLower !== 'shape' &&
                        ftNameLower !== 'shape.len' &&
						ftNameLower !== 'the_geom' &&
						ftNameLower !== 'descriptio' &&
						ftNameLower !== 'name') {
                    $option = $('<option>').
                            attr('value', ft.name).
                            html(ft.name);
                    $attributeSelect.append($option);
                }
            });
        }
    };
    
    me.createPublicationRow = function(link, title, type) {
        var $panelBody = $publicationsPanel.find('>div:nth-child(2)'),
            $closeButtonRow = $('<div />').addClass('pull-right'),
            $closeButton = $('<i />').addClass('fa fa-times'),
            $smallWell = $('<div />').addClass('well well-small'),
            $linkRow = $('<div />').addClass('row'),
            $titleRow = $('<div />').addClass('row'),
            $typeRow = $('<div />').addClass('row'),
            $linkLabel = $('<label />').html('Link'),
            $linkInput = $('<input />').
                attr({
                    type : 'text'
                }).
                addClass('form-control').
                val(link),
            $titleLabel = $('<label />').html('Title'),
            $titleInput = $('<input />').
                attr({
                    type : 'text'
                }).
                addClass('form-control').
                val(title),
            $dataOption = $('<option />').
                attr('value', 'data').
                html('Data'),
            $publicationOption = $('<option />').
                attr('value', 'publications').
                html('Publication'),
            $resourceOption = $('<option />').
                attr('value', 'resource').
                html('Resource'),
            $typeSelect = $('<select />').
                addClass('form-control').
                append($dataOption, $publicationOption, $resourceOption);
            $typeRow.append($typeSelect);
            $typeSelect.val(type);
            
        $closeButton.
            on('click', function () {
                 $smallWell.remove();   
            });
        
        $closeButtonRow.append($closeButton);
        
        $linkRow.append($linkLabel, $linkInput);
        $titleRow.append($titleLabel, $titleInput);
            
        $smallWell.append($closeButtonRow, $titleRow, $linkRow, $typeRow);
        
        $panelBody.append($smallWell);
    };

    me.addItemToForm = function (args) {
        CCH.LOG.info('UI.js::putItemOnForm: Adding item to form.');
        args = args || {};
        var item = args.data || CCH.CONFIG.item,
            id,
            summary,
            titleFull,
            titleMedium,
            titleTiny,
            descriptionFull,
            descriptionMedium,
            descriptionTiny,
            keywords = [],
            services = {};
            
        // Populate children
        CCH.items.each(function (cchItem) {
            if (!item || item.id !== cchItem.id) {
                var option = $('<option />').
                    attr('value', cchItem.id).
                    html(cchItem.summary.tiny.text);
                $childrenSb.append(option);
				$displayedChildrenSb.append(option.clone());
            }
        });

        if (item) {
            item.children = item.children || [];
            id = item.id;
            summary = item.summary;
            titleFull = summary.full.title;
            titleMedium = summary.medium.title;
            titleTiny = summary.tiny.title;
            descriptionFull = summary.full.text;
            descriptionMedium = summary.medium.text;
            descriptionTiny = summary.tiny.text;
            keywords = summary.keywords.split('|');

            // Fill out services
            item.services.each(function (service) {
                services[service.type] = {};
                services[service.type].endpoint = service.endpoint;
                services[service.type].serviceParameter = service.serviceParameter;
            });

            // Hidden field. Should be changed implicitly
            $itemType.val(item.itemType);
            
            $name.
                val(item.name).
                removeAttr('disabled');

            // Add Item ID
            $itemIdInput.val(id);

            // Add Item Text
            $titleFullTextArea.
                html(titleFull).
                removeAttr('disabled');
            $titleMediumTextArea.
                html(titleMedium).
                removeAttr('disabled');
            $titleTinyTextArea.
                html(titleTiny).
                removeAttr('disabled');

            // Add Description Text
            $descriptionFullTextArea.
                html(descriptionFull).
                removeAttr('disabled');
            $descriptionMediumTextArea.
                html(descriptionMedium).
                removeAttr('disabled');
            $descriptionTinyTextArea.
                html(descriptionTiny).
                removeAttr('disabled');

            // Add keywords
            keywords.each(function (keyword) {
                me.addKeywordGroup(keyword);
            });
            $keywordGroup.find('input').removeAttr('disabled');
            $keywordGroup.find('button:nth-child(2)').addClass('hidden');
            $keywordGroup.find('button').removeAttr('disabled');
            $keywordGroup.find('button').on('click', function () {
                if ($keywordGroup.find('input').val() !== '') {
                    me.addKeywordGroup($keywordGroup.find('input').val());
                }
            });

            // Fill out bbox
            $bboxNorth.val(item.bbox[0]).removeAttr('disabled');
            $bboxWest.val(item.bbox[1]).removeAttr('disabled');
            $bboxSouth.val(item.bbox[2]).removeAttr('disabled');
            $bboxEast.val(item.bbox[3]).removeAttr('disabled');

            // Fill out item type
            $type.val(item.type).removeAttr('disabled');

            if (item.services.length > 0) {
                // Fill out attribute selectbox by making a call to the WFS
                CCH.ows.describeFeatureType({
                    layerName : services.proxy_wfs.serviceParameter,
                    callbacks : {
                        success : [function (responseObject) {
                                me.updateSelectAttribtue(responseObject);
                                $attributeSelect.
                                    val(item.attr).
                                    removeAttr('disabled');
                        }]
                    }
                });
                
                // Fill out services panel
                $cswServiceInput.
                    val(services.csw.endpoint).
                    removeAttr('disabled');
                $srcWfsServiceInput.
                    val(services.source_wfs.endpoint).
                    removeAttr('disabled');
                $srcWfsServiceParamInput.
                    val(services.source_wfs.serviceParameter).
                    removeAttr('disabled').
                    keyup(function (evt) {
                        if ($srcWfsServiceInput.val().trim() !== '' &&
                                $(evt.target).val().trim() !== '') {
                            $wfsImportButton.removeAttr('disabled');
                        } else {
                            $wfsImportButton.attr('disabled', 'disabled');
                        }
                });
                $srcWmsServiceInput.
                    val(services.source_wms.endpoint).
                    removeAttr('disabled');
                $srcWmsServiceParamInput.
                    val(services.source_wms.serviceParameter).
                    removeAttr('disabled');
                $proxyWfsServiceInput.
                    val(services.proxy_wfs.endpoint).
                    removeAttr('disabled');
                $proxyWfsServiceParamInput.
                    val(services.proxy_wfs.serviceParameter).
                    removeAttr('disabled');
                $proxyWmsServiceInput.
                    val(services.proxy_wms.endpoint).
                    removeAttr('disabled');
                $proxyWmsServiceParamInput.
                    val(services.proxy_wms.serviceParameter).
                    removeAttr('disabled');
            }
            
            if ($srcWfsServiceInput.val().trim() !== '' && $srcWfsServiceParamInput.val().trim() !== '') {
                $wfsImportButton.removeAttr('disabled');
            } else {
                $wfsImportButton.attr('disabled', 'disabled');
            }
            
            // Ribbonable
            $ribbonableCb.
                prop('checked', item.ribbonable).
                removeAttr('disabled');
        
            // Select children
            item.children.each(function (child) {
                $childrenSb.
                    find('option[value="'+child.id+'"]').
                    prop('selected', 'selected');
            });
			item.displayedChildren.each(function (child) {
				$displayedChildrenSb.
					find('option[value="' + child + '"]').
					prop('selected', 'selected');
			});
            
            // Publications
            $publicationsPanel.find('#form-publish-info-item-panel-publications-button-add').removeAttr('disabled', 'disabled');
            Object.keys(item.summary.full.publications, function (type) {
                item.summary.full.publications[type].each(function (publication) {
                    me.createPublicationRow(publication.link, publication.title, type);
                });
            });

            $childrenSb.removeAttr('disabled');
			$displayedChildrenSb.removeAttr('disabled');
        } else {
            CCH.LOG.warn('UI.js::putItemOnForm: function was called with no item');
        }
    };
    
    $wfsImportButton.on('click', function () {
		var importCall = function () {
			CCH.ows.importWfsLayer({
				endpoint : $srcWfsServiceInput.val(),
				param : $srcWfsServiceParamInput.val(),
				callbacks : {
					success : [ successCallback ],
					error : [ errorCallback ]
				}
			});
		};
		
		var successCallback = function (responseObject) {
			var responseText = responseObject.responseText,
				baseUrl = CCH.CONFIG.publicUrl;

			if (baseUrl.lastIndexOf('/') !== baseUrl.length - 1) {
				baseUrl += '/';
			}

			$proxyWfsServiceInput.val(baseUrl + CCH.CONFIG.data.sources['cida-geoserver'].proxy + 'proxied/wfs');
			$proxyWmsServiceInput.val(baseUrl + CCH.CONFIG.data.sources['cida-geoserver'].proxy + 'proxied/wms');
			$proxyWfsServiceParamInput.val(responseText);
			$proxyWmsServiceParamInput.val(responseText);

			CCH.ows.describeFeatureType({
				layerName : responseText,
				callbacks : {
					success : [
						function (featureDescription) {
							me.updateSelectAttribtue(featureDescription);
						}
					],
					error : [
						function () {
							debugger;
						}
					]
				}
			});
		};
		
		var errorCallback =  function (errorText) {
			if (errorText.indexOf('already exists') !== -1) {
				var $overwriteButton = $('<button />').
					attr({
						type : 'button',
						'data-dismiss' : 'modal'
					}).
					addClass('btn btn-primary').
					html('Overwrite').
					on('click', function () {
						$alertModal.modal('hide');
						
						var deleteCall = function () {
							$alertModal.off('hidden.bs.modal', deleteCall);
							var updatedLayerName = $srcWfsServiceParamInput.val().split(':')[1];
							
							$.ajax({
								url : CCH.CONFIG.contextPath +  '/data/layer/' +  encodeURIComponent(updatedLayerName),
								method : 'DELETE',
								success : function () {
									importCall();
								},
								error : function (jqXHR, err, errTxt) {
									if (errTxt.indexOf('Unauthorized')) {
										$alertModalTitle.html('Layer Could Not Be Removed');
										$alertModalBody.html('It looks like your session has expired.' +
											'You should try reloading the page to continue.');
										$alertModal.modal('show');
									}
									$alertModalTitle.html('Layer Could Not Be Removed');
									$alertModalBody.html('Unfortunately the layer you\'re ' + 
											'trying to import could not be overwritten. ' + 
											'You may need to contact the system administrator ' + 
											'to manually remove it in order to continue');
									$alertModal.modal('show');
								}
							});
						}
						
						$alertModal.on('hidden.bs.modal', deleteCall);
					});
				$alertModalTitle.html('Layer Could Not Be Imported');
				$alertModalBody.html('Layer Already Exists On Server. Overwrite?');
				$alertModalFooter.append($overwriteButton);
				$alertModal.modal('show');
			} else {
				$alertModalTitle.html('Layer Could Not Be Imported');
				$alertModalBody.html('Layer could not be created. Error: ' + errorText);
				$alertModalFooter.append($overwriteButton);
				$alertModal.modal('show');
			}
		};
		
        importCall();
		
    });
    
    $srcWfsServiceParamInput.
        keyup(function (evt) {
            if ($srcWfsServiceInput.val().trim() !== '' &&
                    $(evt.target).val().trim() !== '') {
                $wfsImportButton.removeAttr('disabled');
            } else {
                $wfsImportButton.attr('disabled', 'disabled');
            }
    });
    
    return me;
};
