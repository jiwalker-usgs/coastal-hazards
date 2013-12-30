/*jslint browser: true*/
/*jslint plusplus: true */
/*global $*/
/*global CCH*/
/*global alertify*/
/*global splashUpdate*/

/**
 * Emits: 
 * window: 'bucket-remove'
 * 
 * Listeners:
 * window: 'cch.ui.resized'
 * 
 * @param {type} args
 * @returns {CCH.Objects.BucketSlide.Anonym$12}
 */
CCH.Objects.BucketSlide = function (args) {
    "use strict";
    CCH.LOG.debug('CCH.Objects.BucketSlide::constructor: BucketSlide class is initializing.');
    args = args || {};

    var me = (this === window) ? {} : this;

    me.SLIDE_CONTAINER_ID = args.containerId;
    me.MAP_DIV_ID = args.mapdivId || 'map';
    me.SLIDE_CONTENT_ID = $('#' + me.SLIDE_CONTAINER_ID + ' .application-slide-content').attr('id');
    me.CLOSE_BUTTON = $('#' + me.SLIDE_CONTAINER_ID + '> div > div.application-slide-controlset');
    me.DROPDOWN_CONTAINER = $('#' + me.SLIDE_CONTAINER_ID + '> div > div:first-child > div > div:nth-child(2)');
    me.TOP_LEVEL_DROPDOWN_TRIGGER = me.DROPDOWN_CONTAINER.find('button:first-child');
    me.TOP_LEVEL_LIST = me.DROPDOWN_CONTAINER.find('ul');
    me.TOP_LEVEL_BUTTON_CONTAINER_SELECTOR = '#' + me.SLIDE_CONTAINER_ID + '> div > div:first-child() > div:first-child() > div:nth-child(2)';
    me.TOP_LEVEL_CLEAR = me.TOP_LEVEL_LIST.find('> li:nth-child(1)');
    me.TOP_LEVEL_SHARE = me.TOP_LEVEL_LIST.find('> li:nth-child(2)');
    me.TOP_LEVEL_DOWNLOAD = me.TOP_LEVEL_LIST.find('> li:nth-child(3)');
    me.CARD_TEMPLATE_ID = 'application-slide-bucket-container-card-template';
    me.SLIDE_CONTENT_CONTAINER = 'application-slide-bucket-content-container';
    me.EMPTY_TEXT_CONTAINER = $('#' + me.SLIDE_CONTAINER_ID).find('> div > div > #application-slide-bucket-content-empty');
    me.borderWidth = 2;
    me.animationTime = 500;
    me.placement = 'right';
    me.isSmall = args.isSmall;
    me.startClosed = true;
    me.isInitialized = false;
    me.isClosed = me.startClosed;
    me.cards = [];

    me.open = function () {
        var slideContainer = $('#' + me.SLIDE_CONTAINER_ID),
            extents = me.getExtents(),
            toExtent = me.isSmall() ? extents.small : extents.large;
        $('body').css({
            overflow : 'hidden'
        });
        slideContainer.css({
            display: ''
        });
        slideContainer.animate({
            left: toExtent.left
        }, me.animationTime, function () {
            me.isClosed = false;

            $('body').css({
                overflow : ''
            });
        });
    };

    me.close = function () {
        var slideContainer = $('#' + me.SLIDE_CONTAINER_ID);

        $('body').css({
            overflow : 'hidden'
        });

        slideContainer.animate({
            left: $(window).width()
        }, me.animationTime, function () {
            me.isClosed = true;

            slideContainer.css({
                display: 'none'
            });

            $('body').css({
                overflow : 'hidden'
            });

        });
    };

    me.toggle = function () {
        if (me.isClosed) {
            me.open();
        } else {
            me.close();
        }
    };

    me.resized = function () {
        var extents = me.getExtents(),
            toExtent = me.isSmall() ? extents.small : extents.large,
            slideContainer = $('#' + me.SLIDE_CONTAINER_ID),
            slideContent = $('#' + me.SLIDE_CONTENT_ID),
            windowWidth = $(window).outerWidth();

        if (me.isClosed) {
            slideContainer.css({
                display : 'none'
            });
        } else {
            slideContainer.css({
                'display' : ''
            });
        }

        if (me.isSmall()) {
            if (me.isClosed) {
                slideContainer.css({
                    left: windowWidth
                });
            } else {
                slideContainer.offset(toExtent);
            }
            slideContainer.width(windowWidth - toExtent.left);
            slideContent.width(slideContainer.outerWidth() - me.borderWidth);
        } else {
            if (me.isClosed) {
                slideContainer.css({
                    left: windowWidth,
                    top: toExtent.top
                });
            } else {
                slideContainer.offset(toExtent);
            }
            slideContainer.width(windowWidth - toExtent.left);
            slideContainer.height($('#' + me.MAP_DIV_ID).outerHeight());
            slideContent.width(slideContainer.outerWidth() - me.borderWidth);
        }
    };

    me.getExtents = function () {
        var extents = {
                large: {
                    top: $('#' + me.MAP_DIV_ID).offset().top,
                    left: $('#' + me.MAP_DIV_ID).outerWidth() + $('#' + me.MAP_DIV_ID).offset().left
                },
                small: {
                    // top is handled by css
                    left: 10
                }
            };

        return extents;
    };

    me.getCard = function (args) {
        args = args || {};

        var id = args.id,
            existingIndex,
            $card;

        if (id) {
            existingIndex = me.getCardIndex(id);

            if (existingIndex !== -1) {
                $card = me.cards[existingIndex];
            }
        }

        return $card;
    };

    me.getCardIndex = function (id) {
        return me.cards.findIndex(function (i) {
            return i.data('id') === id;
        });
    };

    me.add = function (args) {
        args = args || {};
        var item = args.item,
            $card;

        if (item && !me.getCard({ id : item.id })) {
            me.EMPTY_TEXT_CONTAINER.addClass('hidden');
            $(me.DROPDOWN_CONTAINER).removeClass('hidden');
            $card = me.createCard({
                item : item
            });
            me.cards.push($card);
            me.append($card);
            me.redrawArrows();
        }

        return $card;
    };

    /**
     * Removes a card from the slider. Passing in no args will clear everything
     * from the slider
     */
    me.remove = function (args) {
        args = args || {};

        var id = args.id,
            childIdArray = args.children,
            $card;

        if (id) {
            $card = me.getCard({ id : id });
            me.cards.removeAt(me.getCardIndex(id));
            
            // I have no children, so I'm just going to remove myself from the map
            if (childIdArray.length === 0) {
                childIdArray.push(id);
            }
            
            // Remove all children from the map
            childIdArray.each(function (childId, i, children) {
                // If this ID appears elsewhere in the card stack, don't remove 
                // it from the map
                if (children.findAll(childId).length > 1) {
                    CCH.map.removeLayersByName(childId);
                }
            });
            
            me.getContainer().find('>div:not(:first-child())').each(function (idx, card) {
                if ($(card).data('id') === id) {
                    $(card).remove();
                }
            });

            if (!me.cards.length) {
                $(me.DROPDOWN_CONTAINER).addClass('hidden');
                me.EMPTY_TEXT_CONTAINER.removeClass('hidden');
            } else {
                me.redrawArrows();
            }
        } else {
            // I find the best way of doing this so it affects two parts of the 
            // application is to bubble this event up to the window level and
            // have Bucket class catch it, remove the item from itself and then 
            // the bucket class will actually call this function with a proper
            // id. It's a long way around removing the item but it does hit 
            // multiple components
            me.cards.reverse().each(function ($card) {
                $(window).trigger('bucket-remove', {
                    id : $card.data('id')
                });
            });
        }

        return $card;
    };

    me.reorderLayers = function () {
        var layerId,
            layer,
            layers = [];

        me.cards.each(function ($cardClone) {
            layerId = $cardClone.data('id');
            layer = CCH.map.getMap().getLayersByName(layerId);

            if (layer.length) {
                layers.push(layer[0]);
            }
        });

        layers.reverse().each(function (layer) {
            CCH.map.getMap().setLayerIndex(layer, CCH.map.getMap().layers.length - 1);
            layer.redraw();
        });
    };

    me.rebuild = function () {
        var $container = me.getContainer();

        $container.empty();
        me.cards.each(function ($card) {
            me.append($card);
        });
        me.redrawArrows();
        return $container;
    };

    me.redrawArrows = function () {
        var cardsLength = me.cards.length,
            id,
            index,
            $cardUpArrow,
            $cardDownArrow;

        me.getContainer().find('>div:not(#application-slide-bucket-content-empty)').each(function (idx, card) {
            id = $(card).data('id');
            index = me.getCardIndex(id);
            $cardUpArrow = $(card).find('> div:nth-child(3) > button:nth-child(2)');
            $cardDownArrow = $(card).find('> div:nth-child(3) > button:nth-child(3)');

            if (cardsLength === 1) {
                // If I am the only card
                $cardUpArrow.addClass('hidden');
                $cardDownArrow.addClass('hidden');
            } else {
                if (index === 0) {
                    // I am the first in the deck
                    $cardUpArrow.addClass('hidden');
                    $cardDownArrow.removeClass('hidden');
                } else if (index === cardsLength - 1) {
                    $cardUpArrow.removeClass('hidden');
                    $cardDownArrow.addClass('hidden');
                } else {
                    $cardUpArrow.removeClass('hidden');
                    $cardDownArrow.removeClass('hidden');
                }
            }
        });
    };

    me.getContainer = function () {
        return $('#' + me.SLIDE_CONTENT_CONTAINER);
    };

    me.append = function ($card) {
        var $container = me.getContainer();
        $container.append($card.clone(true));
    };

    /**
     * Moves a card both in the internal cards array as well as in the view
     */
    me.moveCard = function (args) {
        var id = args.id,
            direction = args.direction,
            cardIndex = me.getCardIndex(id),
            card;

        // Make sure I find the card in my cards array
        if (cardIndex !== -1) {
            card = me.cards[cardIndex];
            // Make sure I'm not trying to move out of bounds
            if ((direction === -1 && cardIndex !== 0) ||
                    (direction === 1 && cardIndex !== me.cards.length - 1)) {
                me.cards.removeAt(cardIndex).splice(cardIndex + direction, 0, card);
            }
        }
        me.rebuild();
        me.reorderLayers();
        return me.cards;
    };

    me.downloadBucket = function () {
        CCH.session.writeSession({
            callbacks : {
                success : [
                    function (result) {
                        var sessionId = result.sid;

                        if (sessionId) {
                            window.open(window.location.origin + CCH.CONFIG.contextPath + '/data/download/view/' + sessionId);
                        }
                    }
                ],
                error : [
                    function () {
                        alertify.error('An error has occured. We were not able to ' +
                                    'create your download package.', 3000);
                    }
                ]
            }
        });
    };

    me.createCard = function (args) {
        args = args || {};
        var item = args.item,
            id = item.id || new Date().getMilliseconds(),
            title = item.summary.tiny.text || 'Title Not Provided',
            titleContainerClass = 'application-slide-bucket-container-card-title',
            card = $('#' + me.CARD_TEMPLATE_ID).children().clone(true),
            titleContainer = card.find('.' + titleContainerClass),
            titleContainerPNode = card.find('.' + titleContainerClass + ' p'),
            imageContainer = card.find('> div:first-child img').first(),
            viewButton = card.find('> div:nth-child(4) > button:nth-child(1)'),
            shareButton = card.find('> div:nth-child(4) > button:nth-child(2)'),
            downloadButton = card.find('> div:nth-child(4) > button:nth-child(3)'),
            infoButton = card.find('> div:nth-child(4) > button:nth-child(4)'),
            removeButton = card.find('> div:nth-child(3) > button:nth-child(1)'),
            upButton = card.find('> div:nth-child(3) > button:nth-child(2)'),
            downButton = card.find('> div:nth-child(3)> button:nth-child(3)');

        card.attr('id', 'application-slide-bucket-container-card-' + id);
        imageContainer.attr('src', 'http://www.tshirtdesignsnprint.com/img/not-found.png');
        titleContainer.attr('id', titleContainerClass + '-' + id);
        titleContainerPNode.html(title);
        card.data('id', id);

        removeButton.on('click', function ($evt) {
            $evt.stopPropagation();

            // I emit this to the top so that bucket can catch it, decrement itself
            // and then pass on the remove back down here to my remove method
            $(window).trigger('bucket-remove', {
                id : id
            });
        });

        downloadButton.on('click', function () {
            window.location = window.location.origin + CCH.CONFIG.contextPath + '/data/download/item/' + id;
        });

        viewButton.on('click', function (evt) {
            var addingLayer = !$(evt.target).hasClass('active');
            if (addingLayer) {
                item.showLayer();
            } else {
                item.hideLayer();
            }

            $(window).trigger('slide.bucket.button.click.view', {
                'adding' : addingLayer,
                'id' : id
            });
        });

        upButton.on('click', function () {
            me.moveCard({
                id : id,
                direction : -1
            });
        });

        downButton.on('click', function () {
            me.moveCard({
                id : id,
                direction : 1
            });
        });

        shareButton.on('click', function () {
            $(window).trigger('slide.bucket.button.click.share', {
                'type' : 'item',
                'id' : id
            });
        });
        
        infoButton.on('click', function () {
            $(window).trigger('slide.bucket.button.click.info', {
                'id' : id
            });
            window.open(window.location.origin + CCH.CONFIG.contextPath + '/ui/info/item/' + id, '_portal_info_window')
        });

        infoButton.attr({
            'target' : '_portal_info_window',
            'href' : window.location.origin + CCH.CONFIG.contextPath + '/ui/info/item/' + id
        });

        $(window).on('cch.map.added.layer', function (evt, args) {
            var layer = args.layer,
                vButton;

            if (layer.name === id) {
                vButton = $('#' + 'application-slide-bucket-container-card-' + id).find('>div:nth-child(2)>div>button:nth-child(1)');

                // I do a timeout here because in some instances, this event
                // occurs and doesn't allow for button toggling
                setTimeout(function () {
                    if (!vButton.hasClass('active')) {
                        vButton.addClass('active');
                    }
                }, 200);
            }
        });
        $(window).on('cch.map.removed.layer', function (evt, args) {
            var layer = args.layer,
                vButton;

            if (layer.name === id) {
                vButton = $('#' + 'application-slide-bucket-container-card-' + id).find('>div:nth-child(2)>div>button:nth-child(1)');

                setTimeout(function () {
                    if (vButton.hasClass('active')) {
                        vButton.removeClass('active');
                    }
                }, 200);
            }
        });

        item.showLayer();

        card.getContainer = function () {
            return $('#' + this.attr('id'));
        };

        return card;
    };
    
    $(window).on('cch.ui.resized', function (args) {
        me.resized(args);
    });

    me.TOP_LEVEL_DROPDOWN_TRIGGER.on('click', function (evt) {
        evt.stopImmediatePropagation();
        $(evt.target).dropdown('toggle');
    });

    $(me.CLOSE_BUTTON).on('click', function () {
        me.toggle();
    });

    $(me.TOP_LEVEL_CLEAR).on('click', function () {
        me.remove();
    });
    $(me.TOP_LEVEL_SHARE).on('click', function (evt) {
        evt.stopPropagation();

        $(window).trigger('slide.bucket.button.click.share', {
            'type' : 'session'
        });
    });
    $(me.TOP_LEVEL_DOWNLOAD).on('click', function (evt) {
        evt.stopPropagation();
        me.downloadBucket();
    });

    CCH.LOG.debug('CCH.Objects.BucketSlide::constructor: BucketSlide class initialized.');
    return {
        events : me.events,
        open: me.open,
        close: me.close,
        toggle : me.toggle,
        add : me.add,
        remove : me.remove,
        getContainer : me.getContainer,
        getCard : me.getCard,
        createCard : me.createCard,
        moveCard : me.moveCard,
        isClosed : me.isClosed,
        cards : me.cards,
        reorderLayers : me.reorderLayers,
        CLASS_NAME : 'CCH.Objects.BucketSlide'
    };
};