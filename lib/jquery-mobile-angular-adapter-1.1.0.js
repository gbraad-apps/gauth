/**
* jQuery Mobile angularJS adaper v1.1.0
* http://github.com/tigbro/jquery-mobile-angular-adapter
*
* Copyright 2011, Tobias Bosch (OPITZ CONSULTING GmbH)
* Licensed under the MIT license.
*/
(function(factory) {
if (typeof define === "function" && define.amd) {
define(["jquery", "angular", "jquery.mobile"], factory);
} else {
factory(window.jQuery, window.angular);
}
})(function($, angular) {
(function ($) {
    function patch(obj, fnName, callback) {
        var _old = obj[fnName];
        obj[fnName] = function () {
            return callback(_old, this, arguments);
        }
    }

    // selectmenu may create parent elements and extra pages
    patch($.mobile.selectmenu.prototype, 'destroy', function (old, self, args) {
        old.apply(self, args);
        var menuPage = self.menuPage;
        var screen = self.screen;
        var listbox = self.listbox;
        menuPage && menuPage.remove();
        screen && screen.remove();
        listbox && listbox.remove();
    });

    // Listview may create subpages that need to be removed when the widget is destroyed.
    patch($.mobile.listview.prototype, "destroy", function (old, self, args) {
        // Destroy the widget instance first to prevent
        // a stack overflow.
        // Note: If there are more than 1 listview on the page, childPages will return
        // the child pages of all listviews.
        var id = self.element.attr('id');
        var childPageRegex = new RegExp($.mobile.subPageUrlKey + "=" + id + "-");
        var childPages = self.childPages();
        old.apply(self, args);
        for (var i = 0; i < childPages.length; i++) {
            var childPage = $(childPages[i]);
            var dataUrl = childPage.attr('data-url');
            if (dataUrl.match(childPageRegex)) {
                childPage.remove();
            }
        }
    });

    // refresh of listview should refresh also non visible entries if the
    // listview itself is not visible
    patch($.mobile.listview.prototype, "refresh", function (old, self, args) {
        if (self.element.filter(":visible").length === 0) {
            return old.call(self, true);
        } else {
            return old.apply(self, args);
        }
    });

    // Copy of the initialization code from jquery mobile for controlgroup.
    // Needed in jqm 1.1, as we want to do a manual initialization.
    // See the open task in jqm 1.1 for controlgroup.
    if ($.fn.controlgroup) {
        $(document).bind("pagecreate create", function (e) {
            $(":jqmData(role='controlgroup')", e.target)
                .jqmEnhanceable()
                .controlgroup({ excludeInvisible:false });
        });
    }

    // controlgroup should not exclude invisible children
    // as long as it is not visible itself!
    patch($.fn, "controlgroup", function (old, self, args) {
        if (self.filter(":visible").length === 0) {
            var options = args[0] || {};
            options.excludeInvisible = false;
            return old.call(self, options);
        }
        return old.apply(self, args);
    });

})($);
/**
 * This will delay the angular initialization by two nested calls to jQuery.fn.ready.
 * By this, angular initialization will always be the last that is called by jQuery.fn.ready.
 * This is needed so that other libs (especially jqm), who also rely on jQuery.fn.ready for initialization, have
 * the chance to initialize before angular, no matter in which order the libs are included in the dom.
 * <p>
 * Concrete problem: See ui/integration/regressionSpec#navigation
 * <p>
 * Details: This is a copy of the scan for ng-app, ... attributes of angular. This will also remove
 * those attributes from the dom, so angular does not get to see them.
 */
(function ($, angular) {
    var forEach = angular.forEach;
    function deferAngularBootstrap(element, bootstrap) {
        $.holdReady(true);
        var doc = element.nodeType === 9 ? element : element.ownerDocument;
        addReadyListener(doc, function () {
            var config = findAndRemoveAngularConfig(element);
            if (config) {
                $(function () {
                    bootstrap(config.appElement, config.module);
                })
            }
            $.holdReady(false);
        });
    }

    function findAndRemoveAngularConfig(element) {
        var elements = [element],
            appElement,
            module,
            names = ['ng:app', 'ng-app', 'x-ng-app', 'data-ng-app'],
            NG_APP_CLASS_REGEXP = /\sng[:\-]app(:\s*([\w\d_]+);?)?\s/;

        function append(element) {
            element && elements.push(element);
        }

        forEach(names, function (name) {
            names[name] = true;
            append(document.getElementById(name));
            name = name.replace(':', '\\:');
            if (element.querySelectorAll) {
                forEach(element.querySelectorAll('.' + name), append);
                forEach(element.querySelectorAll('.' + name + '\\:'), append);
                forEach(element.querySelectorAll('[' + name + ']'), append);
            }
        });

        forEach(elements, function (element) {
            if (!appElement) {
                if (element.getAttribute) {
                    var id = element.getAttribute("id");
                    forEach(names, function (name) {
                        if (id === name) {
                            element.removeAttribute("id");
                        }
                    });
                }
                if (element.className) {
                    var newClassAttr = element.className.replace(/[^;]+;?/g, function (classPart) {
                        var className = ' ' + classPart + ' ';
                        var match = NG_APP_CLASS_REGEXP.exec(className);
                        if (match) {
                            appElement = element;
                            module = (match[2] || '').replace(/\s+/g, ',');
                            return '';
                        }
                        return classPart;
                    });
                    if (!newClassAttr) {
                        element.removeAttribute("class");
                    } else {
                        element.className = newClassAttr;
                    }
                }
                var attrs = [];
                forEach(element.attributes, function (attr) {
                    if (!appElement && names[attr.name]) {
                        appElement = element;
                        module = attr.value;
                        attrs.push(attr);
                    }
                });
                forEach(attrs, function (attr) {
                    element.removeAttributeNode(attr);
                });
            }
        });
        if (appElement) {
            return {
                appElement:appElement,
                module:module ? [module] : []
            }
        } else {
            return undefined;
        }
    }

    // See jQuery.bindReady
    function addReadyListener(document, fn) {
        var executed = false;

        function callOnce() {
            if (!executed) {
                executed = true;
                fn();
            }
        }

        // Catch cases where $(document).ready() is called after the
        // browser event has already occurred.
        if (document.readyState === "complete") {
            callOnce();
        } else {
            document.addEventListener("DOMContentLoaded", callOnce, false);

            // A fallback to window.onload, that will always work
            window.addEventListener("load", callOnce, false);
        }
    }

    deferAngularBootstrap(document, angular.bootstrap);

    // expose for tests
    $.mobile.deferAngularBootstrap = deferAngularBootstrap;
})($, angular);

/**
 * Helper that introduces the concept of precompilation: Preprocess the dom before
 * angular processes it.
 * <p>
 * Usage: Create a decorator or a factory for the $precompile service.
 */
(function ($, angular) {
    var ng = angular.module('ng');
    ng.factory("$precompile", function() {
        return function(element) {
            // This is empty and can be decorated using $provide.decorator.
            return element;
        }
    });

    ng.config(['$provide', function ($provide) {
        $provide.decorator('$compile', ['$precompile', '$delegate', function ($precompile, $compile) {
            return function () {
                arguments[0] = $precompile(arguments[0]);
                return $compile.apply(this, arguments);
            }
        }]);
    }]);

    function precompileHtmlString(html, $precompile) {
        var $template = $('<div>' + html + '</div>');
        $precompile($template.contents());
        return $template.html();
    }

    ng.config(['$compileProvider', '$provide', function ($compileProvider, $provide) {
        var directiveTemplateUrls = {};

        // Hook into the registration of directives to:
        // - preprocess template html
        // - mark urls from templateUrls so we can preprocess it later in $http
        var _directive = $compileProvider.directive;
        $compileProvider.directive = function (name, factory) {
            var newFactory = function ($precompile, $injector) {
                var res = $injector.invoke(factory);
                if (res.template) {
                    res.template = precompileHtmlString(res.template, $precompile);
                } else if (res.templateUrl) {
                    directiveTemplateUrls[res.templateUrl] = true;
                }
                return res;
            };
            return _directive.call(this, name, ['$precompile', '$injector', newFactory]);
        };

        // preprocess $http results for templateUrls.
        $provide.decorator('$http', ['$q', '$delegate', '$precompile', function ($q, $http, $precompile) {
            var _get = $http.get;
            $http.get = function (url) {
                var res = _get.apply(this, arguments);
                if (directiveTemplateUrls[url]) {
                    var _success = res.success;
                    res.success = function(callback) {
                        var newCallback = function() {
                            var content = arguments[0];
                            arguments[0] = precompileHtmlString(content, $precompile);
                            return callback.apply(this, arguments);
                        };
                        return _success(newCallback);
                    };
                }
                return res;
            };
            return $http;
        }]);
    }]);

})($, angular);
(function (angular) {

    var ng = angular.module('ng');
    ng.config(['$provide', function($provide) {
        $provide.decorator('$rootScope', ['$delegate', function($rootScope) {
            $rootScope.$disconnect = function() {
                if (this.$root == this) return; // we can't disconnect the root node;
                var parent = this.$parent;
                this.$$disconnected = true;
                // See Scope.$destroy
                if (parent.$$childHead == this) parent.$$childHead = this.$$nextSibling;
                if (parent.$$childTail == this) parent.$$childTail = this.$$prevSibling;
                if (this.$$prevSibling) this.$$prevSibling.$$nextSibling = this.$$nextSibling;
                if (this.$$nextSibling) this.$$nextSibling.$$prevSibling = this.$$prevSibling;
                this.$$nextSibling = this.$$prevSibling = null;
            };
            $rootScope.$reconnect = function() {
                if (this.$root == this) return; // we can't disconnect the root node;
                var child = this;
                if (!child.$$disconnected) {
                    return;
                }
                var parent = child.$parent;
                child.$$disconnected = false;
                // See Scope.$new for this logic...
                child.$$prevSibling = parent.$$childTail;
                if (parent.$$childHead) {
                    parent.$$childTail.$$nextSibling = child;
                    parent.$$childTail = child;
                } else {
                    parent.$$childHead = parent.$$childTail = child;
                }

            };
            return $rootScope;
        }]);
    }]);
})(angular);
(function (angular) {
    var ng = angular.module('ng');
    ng.config(['$provide', function ($provide) {
        $provide.decorator('$rootScope', ['$delegate', function ($rootScope) {
            var _apply = $rootScope.$apply;
            $rootScope.$apply = function () {
                if ($rootScope.$$phase) {
                    return $rootScope.$eval.apply(this, arguments);
                }
                return _apply.apply(this, arguments);
            };
            var refreshing = false;
            var _digest = $rootScope.$digest;
            $rootScope.$digest = function () {
                if ($rootScope.$$phase) {
                    return;
                }
                var res = _digest.apply(this, arguments);
            };
            return $rootScope;
        }]);
    }]);
})(angular);
(function ($, angular) {
    // Only digest the $.mobile.activePage when rootScope.$digest is called.
    var ng = angular.module('ng');
    $('div').live('pagebeforeshow', function (event, data) {
        var page = $(event.target);
        var currPageScope = page.scope();
        if (currPageScope) {
            currPageScope.$root.$digest();
        }
    });

    $.mobile.autoInitializePage = false;
    var lastCreatedPages = [];
    var jqmInitialized = false;

    ng.config(['$provide', function ($provide) {
        $provide.decorator('$rootScope', ['$delegate', function ($rootScope) {
            var _$digest = $rootScope.$digest;
            var lastActiveScope;
            $rootScope.$digest = function () {
                if (this === $rootScope) {
                    var p = $.mobile.activePage;
                    var activeScope = p && p.scope();
                    if (lastActiveScope && lastActiveScope !== activeScope) {
                        lastActiveScope.$disconnect();
                    }
                    lastActiveScope = activeScope;
                    if (activeScope) {
                        activeScope.$reconnect();
                    }
                }
                var res = _$digest.apply(this, arguments);
                if (this === $rootScope) {
                    var hasPages = lastCreatedPages.length;
                    while (lastCreatedPages.length) {
                        var pageScope = lastCreatedPages.shift();
                        // Detach the scope of the created pages from the normal $digest cycle.
                        // Needed so that only $.mobile.activePage gets digested when rootScope.$digest
                        // is called.
                        // However, allow one digest to process every page
                        // so that we can use ng-repeat also for jqm pages!
                        pageScope.$disconnect();
                    }
                    if (hasPages && !jqmInitialized) {
                        jqmInitialized = true;
                        $.mobile.initializePage();
                    }
                }

                return res;
            };
            return $rootScope;
        }]);
    }]);

    function connectToDocument(node, callback) {
        // search the top most element for node.
        while (node.parentNode && node.parentNode.nodeType === 1) {
            node = node.parentNode;
        }
        var oldParentNode = node.parentNode;
        if (oldParentNode !== document) {
            document.documentElement.appendChild(node);
        }
        try {
            return callback();
        } finally {
            if (oldParentNode !== document) {
                oldParentNode.appendChild(node);
            }
        }
    }

    /**
     * This directive will enhance the dom during compile
     * with non widget markup. This will also mark elements that contain
     * jqm widgets.
     */
    ng.factory('$precompile', function () {
        var pageSelector = ':jqmData(role="page"), :jqmData(role="dialog")';

        return function (element) {
            // save the old parent
            var oldParentNode = element[0].parentNode;

            // if the element is not connected with the document element,
            // the enhancements of jquery mobile do not work (uses event listeners for the document).
            // So temporarily connect it...
            connectToDocument(element[0], function () {

                var pages = element.find(pageSelector).add(element.filter(pageSelector));
                pages.attr("ngm-page", "true");

                // enhance non-widgets markup.
                markJqmWidgetCreation(function () {
                    preventJqmWidgetCreation(function () {
                        if (pages.length > 0) {
                            // element contains pages.
                            // create temporary pages for the non widget markup, that we destroy afterwards.
                            // This is ok as non widget markup does not hold state, i.e. no permanent reference to the page.
                            pages.page();
                        } else {
                            element.parent().trigger("create");
                        }
                    });
                });

                // Destroy the temporary pages again
                pages.page("destroy");
            });

            // If the element wrapped itself into a new element,
            // return the element that is under the same original parent
            while (element[0].parentNode !== oldParentNode) {
                element = element.eq(0).parent();
            }

            return element;
        }
    });

    /**
     * Special directive for pages, as they need an own scope.
     */
    ng.directive('ngmPage', function () {
        return {
            restrict:'A',
            scope:true,
            compile:function (tElement, tAttrs) {
                tElement.removeAttr("ngm-page");
                return {
                    pre:function (scope, iElement, iAttrs) {
                        // Create the page widget without the pagecreate-Event.
                        // This does no dom transformation, so it's safe to call this in the prelink function.
                        createPagesWithoutPageCreateEvent(iElement);
                        lastCreatedPages.push(scope);
                    }
                };
            }
        };
    });

    // If jqm loads a page from an external source, angular needs to compile it too!
    ng.run(['$rootScope', '$compile', function ($rootScope, $compile) {
        patchJq('page', function () {
            if (!preventJqmWidgetCreation() && !this.data("page")) {
                if (this.attr("data-" + $.mobile.ns + "external-page")) {
                    $compile(this)($rootScope);
                }
            }
            return $.fn.orig.page.apply(this, arguments);
        });
    }]);

    $.mobile.registerJqmNgWidget = function (widgetName, widgetSpec) {
        jqmWidgets[widgetName] = widgetSpec;
        patchJqmWidget(widgetName, widgetSpec.precompile);
    };

    var jqmWidgets = {};
    /**
     * Directive for calling the create function of a jqm widget.
     * For elements that wrap themselves into new elements (like `<input type="checked">`) ngmCreate will be called
     * on the wrapper element for the input and the label, which is created during precompile.
     * ngmLink will be called on the actual input element, so we have access to the ngModel and attrs for $observe calls.
     */
    ng.directive("ngmCreate", function () {
        return {
            restrict:'A',
            // after the normal angular widgets like input, ngModel, ...
            priority:0,
            compile:function (tElement, tAttrs) {
                var widgets = JSON.parse(tAttrs.ngmCreate);
                return {
                    post:function (scope, iElement, iAttrs, ctrls) {
                        var widgetName, widgetSpec, initArgs, origCreate;
                        for (widgetName in widgets) {
                            widgetSpec = jqmWidgets[widgetName];
                            initArgs = widgets[widgetName];
                            origCreate = $.fn.orig[widgetName];
                            if (widgetSpec.create) {
                                widgetSpec.create(origCreate, iElement, initArgs);
                            } else {
                                origCreate.apply(iElement, initArgs);
                            }
                        }
                    }
                };
            }
        }
    });

    /**
     * Directive for connecting widgets with angular. See ngmCreate.
     */
    ng.directive("ngmLink", function () {
        return {
            restrict:'A',
            priority:0,
            require:['?ngModel'],
            compile:function (tElement, tAttrs) {
                var widgets = JSON.parse(tAttrs.ngmLink);
                return {
                    post:function (scope, iElement, iAttrs, ctrls) {
                        var widgetName, widgetSpec;
                        for (widgetName in widgets) {
                            widgetSpec = jqmWidgets[widgetName];
                            widgetSpec.link(scope, iElement, iAttrs, ctrls);
                        }
                    }
                };
            }
        }
    });

    function patchJqmWidget(widgetName, precompileFn) {
        patchJq(widgetName, function () {
            if (markJqmWidgetCreation()) {
                var args = Array.prototype.slice.call(arguments);
                var self = this;
                for (var k = 0; k < self.length; k++) {
                    var element = self.eq(k);
                    var createElement = element;
                    if (precompileFn) {
                        createElement = precompileFn(element, args) || createElement;
                    }
                    var ngmCreateStr = createElement.attr("ngm-create") || '{}';
                    var ngmCreate = JSON.parse(ngmCreateStr);
                    ngmCreate[widgetName] = args;
                    createElement.attr("ngm-create", JSON.stringify(ngmCreate));
                    // attribute needs to be after the ngm-create attribute!
                    var ngmLinkStr = element.attr("ngm-link") || '{}';
                    var ngmLink = JSON.parse(ngmLinkStr);
                    ngmLink[widgetName] = true;
                    element.attr("ngm-link", JSON.stringify(ngmLink));
                }
            }
            if (preventJqmWidgetCreation()) {
                return false;
            }
            return $.fn.orig[widgetName].apply(this, arguments);
        });
    }

    $.fn.orig = {};

    function patchJq(fnName, callback) {
        $.fn.orig[fnName] = $.fn.orig[fnName] || $.fn[fnName];
        $.fn[fnName] = callback;
    }

    var _execFlags = {};

    function execWithFlag(flag, fn) {
        if (!fn) {
            return _execFlags[flag];
        }
        var old = _execFlags[flag];
        _execFlags[flag] = true;
        var res = fn();
        _execFlags[flag] = old;
        return res;
    }

    function preventJqmWidgetCreation(fn) {
        return execWithFlag('preventJqmWidgetCreation', fn);
    }

    function markJqmWidgetCreation(fn) {
        return execWithFlag('markJqmWidgetCreation', fn);
    }

    function createPagesWithoutPageCreateEvent(pages) {
        preventJqmWidgetCreation(function () {
            var oldPrefix = $.mobile.page.prototype.widgetEventPrefix;
            $.mobile.page.prototype.widgetEventPrefix = 'noop';
            pages.page();
            $.mobile.page.prototype.widgetEventPrefix = oldPrefix;
        });
    }

})($, angular);
(function (angular, $) {
    var widgetConfig = {
        checkboxradio:{
            handlers:[disabledHandler, refreshAfterNgModelRender, checkedHandler],
            precompile:checkboxRadioPrecompile,
            create:checkboxRadioCreate
        },
        button:{
            handlers:[disabledHandler],
            precompile:buttonPrecompile,
            create:buttonCreate
        },
        collapsible:{
            handlers:[disabledHandler]
        },
        textinput:{
            handlers:[disabledHandler],
            precompile:textinputPrecompile,
            create:textinputCreate
        },
        slider:{
            handlers:[disabledHandler, refreshAfterNgModelRender],
            precompile:sliderPrecompile,
            create:sliderCreate
        },
        listview:{
            handlers:[refreshOnChildrenChange]
        },
        collapsibleset:{
            handlers:[refreshOnChildrenChange]
        },
        selectmenu:{
            handlers:[disabledHandler, refreshAfterNgModelRender, refreshOnChildrenChange],
            precompile:selectmenuPrecompile,
            create:selectmenuCreate
        },
        controlgroup:{
            handlers:[refreshControlgroupOnChildrenChange]
        },
        navbar:{
            handlers:[]
        },
        dialog:{
            handlers:[]
        },
        fixedtoolbar:{
            handlers:[]
        }
    };

    function mergeHandlers(widgetName, list) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(widgetName);
            for (var i = 0; i < list.length; i++) {
                list[i].apply(this, args);
            }
        }
    }

    var config;
    for (var widgetName in widgetConfig) {
        config = widgetConfig[widgetName];
        config.link = mergeHandlers(widgetName, config.handlers);
        $.mobile.registerJqmNgWidget(widgetName, config);
    }

    // -------------------
    // precompile functions

    // Checkboxradio wraps the input and label into a new element.
    // The angular compiler does not like this, as it changes elements that are not
    // in the subtree of the input element that is currently linked.
    function checkboxRadioPrecompile(origElement, initArgs) {
        // Selectors: See the checkboxradio-Plugin in jqm.
        var parentLabel = $(origElement).closest("label");
        var container = $(origElement).closest("form,fieldset,:jqmData(role='page'),:jqmData(role='dialog')");
        if (container.length===0) {
            container = origElement.parent();
        }
        var label = parentLabel.length ? parentLabel : container.find("label").filter("[for='" + origElement[0].id + "']");
        var wrapper = $("<div></div>").insertBefore(origElement).append(origElement).append(label);
        moveCloningDirectives(origElement, origElement.parent());
        return wrapper;
    }

    function checkboxRadioCreate(origCreate, element, initArgs) {
        var _wrapAll = $.fn.wrapAll;
        var input = element.children("input");
        var wrapper = element;
        $.fn.wrapAll = function (container) {
            if (this[0] === input[0]) {
                $.fn.wrapAll = _wrapAll;
                var tempContainer = $(container);
                wrapper[0].className = tempContainer[0].className;
                return input;
            }
            return _wrapAll.apply(this, arguments);
        };
        var res = origCreate.apply(input, initArgs);
        $.fn.wrapAll = _wrapAll;
        return res;
    }

    // Slider appends a new element after the input/select element for which it was created.
    // The angular compiler does not like this, so we wrap the two elements into a new parent node.
    function sliderPrecompile(origElement, initArgs) {
        origElement.wrapAll("<div></div>");
        var wrapper = origElement.parent();
        moveCloningDirectives(origElement, wrapper);
        return wrapper;
    }

    function sliderCreate(origCreate, element, initArgs) {
        var slider = element.children().eq(0);
        origCreate.apply(slider, initArgs);
    }

    // Button wraps itself into a new element.
    // Angular does not like this, so we do it in advance.
    function buttonPrecompile(origElement, initArgs) {
        var wrapper = $("<div></div>")
            .text(origElement.text() || origElement.val())
            .insertBefore(origElement)
            .append(origElement);
        moveCloningDirectives(origElement, wrapper);
        return wrapper;
    }

    function buttonCreate(origCreate, element, initArgs) {
        var wrapper = element;
        var button = element.children().eq(0);

        var _text = $.fn.text;
        $.fn.text = function () {
            if (arguments.length > 0) {
                // Only catch the first setter call
                $.fn.text = _text;
                return wrapper;
            }
            return _text.apply(this, arguments);
        };

        var _insertBefore = $.fn.insertBefore;
        $.fn.insertBefore = function (element) {
            if (this[0] === wrapper[0] && element[0] === button[0]) {
                return wrapper;
            }
            return _insertBefore.apply(this, arguments);
        };

        var res = origCreate.apply(button, initArgs);

        $.fn.text = _text;
        $.fn.insertBefore = _insertBefore;
        return res;
    }

    // selectmenu wraps itself into a new element.
    // Angular does not like this, so we do it in advance.
    function selectmenuPrecompile(origElement, initArgs) {
        var wrapper = $("<div></div>").insertBefore(origElement).append(origElement);
        moveCloningDirectives(origElement, wrapper);
        return wrapper;
    }

    function selectmenuCreate(origCreate, element, initArgs) {
        var wrapper = element;
        var select = element.children().eq(0);

        var _wrap = $.fn.wrap;
        $.fn.wrap = function (container) {
            if (this[0] === select[0]) {
                $.fn.wrap = _wrap;
                var tempContainer = $(container);
                wrapper[0].className = tempContainer[0].className;

                return select;
            }
            return _wrap.apply(this, arguments);
        };

        var res = origCreate.apply(select, initArgs);

        $.fn.wrap = _wrap;
        return res;
    }

    // textinput for input-type "search" wraps itself into a new element
    function textinputPrecompile(origElement, initArgs) {
        if (!origElement.is("[type='search'],:jqmData(type='search')")) {
            return origElement;
        }
        var wrapper = $("<div></div>").insertBefore(origElement).append(origElement);
        moveCloningDirectives(origElement, wrapper);
        return wrapper;
    }

    function textinputCreate(origCreate, element, initArgs) {
        if (element[0].nodeName.toUpperCase()==="INPUT") {
            // no wrapper
            return origCreate.apply(element, initArgs);
        }
        var wrapper = element;
        var input = element.children().eq(0);

        var _wrap = $.fn.wrap;
        $.fn.wrap = function (container) {
            if (this[0] === input[0]) {
                $.fn.wrap = _wrap;
                var tempContainer = $(container);
                wrapper[0].className = tempContainer[0].className;

                return input;
            }
            return _wrap.apply(this, arguments);
        };

        var res = origCreate.apply(input, initArgs);

        $.fn.wrap = _wrap;
        return res;
    }

    var CLONING_DIRECTIVE_REGEXP = /(^|[\W])(repeat|switch-when|if)($|[\W])/;

    function moveCloningDirectives(source, target) {
        // iterate over the attributes
        var cloningAttrNames = [];
        var node = source[0];
        var targetNode = target[0];
        var nAttrs = node.attributes;
        var attrCount = nAttrs && nAttrs.length;
        if (attrCount) {
            for (var attr, name,
                     j = attrCount - 1; j >= 0; j--) {
                attr = nAttrs[j];
                name = attr.name;
                if (CLONING_DIRECTIVE_REGEXP.test(name)) {
                    node.removeAttributeNode(attr);
                    targetNode.setAttributeNode(attr);
                }
            }
        }

        // iterate over the class names.
        var targetClassName = '';
        var className = node.className;
        var match;
        if (className) {
            className = className.replace(/[^;]+;?/, function (match) {
                if (CLONING_DIRECTIVE_REGEXP.test(match)) {
                    targetClassName += match;
                    return '';
                }
                return match;
            });
        }
        if (targetClassName) {
            targetNode.className = targetClassName;
            node.className = className;
        }
    }

    // Expose for tests.
    $.mobile.moveCloningDirectives = moveCloningDirectives;


    // -------------------
    // link handlers
    function disabledHandler(widgetName, scope, iElement, iAttrs, ctrls) {
        iAttrs.$observe("disabled", function (value) {
            if (value) {
                iElement[widgetName]("disable");
            } else {
                iElement[widgetName]("enable");
            }
        });
    }

    function checkedHandler(widgetName, scope, iElement, iAttrs, ctrls) {
        iAttrs.$observe("checked", function (value) {
            triggerAsyncRefresh(widgetName, scope, iElement, "refresh");
        });
    }

    function addCtrlFunctionListener(ctrl, ctrlFnName, fn) {
        var listenersName = "_listeners" + ctrlFnName;
        if (!ctrl[listenersName]) {
            ctrl[listenersName] = [];
            var oldFn = ctrl[ctrlFnName];
            ctrl[ctrlFnName] = function () {
                var res = oldFn.apply(this, arguments);
                for (var i = 0; i < ctrl[listenersName].length; i++) {
                    ctrl[listenersName][i]();
                }
                return res;
            };
        }
        ctrl[listenersName].push(fn);
    }

    function refreshAfterNgModelRender(widgetName, scope, iElement, iAttrs, ctrls) {
        var ngModelCtrl = ctrls[0];
        if (ngModelCtrl) {
            addCtrlFunctionListener(ngModelCtrl, "$render", function () {
                triggerAsyncRefresh(widgetName, scope, iElement, "refresh");
            });
        }
    }

    function refreshControlgroupOnChildrenChange(widgetName, scope, iElement, iAttrs, ctrls) {
        iElement.bind("$childrenChanged", function () {
            triggerAsyncRefresh(widgetName, scope, iElement, {});
        });
    }


    function refreshOnChildrenChange(widgetName, scope, iElement, iAttrs, ctrls) {
        iElement.bind("$childrenChanged", function () {
            triggerAsyncRefresh(widgetName, scope, iElement, "refresh");
        });
    }

    function triggerAsyncRefresh(widgetName, scope, iElement, options) {
        var prop = "_refresh" + widgetName;
        var refreshId = (iElement.data(prop) || 0) + 1;
        iElement.data(prop, refreshId);
        scope.$evalAsync(function () {
            if (iElement.data(prop) === refreshId) {
                iElement[widgetName](options);
            }
        });
    }


})(angular, $);
/**
 * This is an extension to the locationProvider of angular and provides a new mode: jqmCompat-mode.
 * <p>
 * This mode allows to use the normal jquery mobile hash handling (hash = page id).
 * For this to work, it maps window.location directly to $location, without hashbang or html5 mode.
 * Furthermore, this mode extends the $browser so that it reuses the hashchange handler of
 * jqm and ensures, that angular's handler is always called before the one from jqm.
 * By this, $location is always up to date when jquery mobile fires pagebeforecreate, ...
 * Note: In this mode, angular routes are not useful.
 * <p>
 * If this mode is turned off, the hash listening and chaning of jqm is completely deactivated.
 * Then you are able to use angular's routes for navigation and `$navigate` service for jqm page navigation.
 * <p>
 * Configuration: $locationProvider.jqmCompatMode(bool). Default is `true`.
 * <p>
 * Note: Much of the code below is copied from angular, as it is contained in an internal angular function scope.
 */
(function (angular, $) {
    var URL_MATCH = /^([^:]+):\/\/(\w+:{0,1}\w*@)?([\w\.-]*)(:([0-9]+))?(\/[^\?#]*)?(\?([^#]*))?(#(.*))?$/,
        PATH_MATCH = /^([^\?#]*)?(\?([^#]*))?(#(.*))?$/,
        DEFAULT_PORTS = {'http':80, 'https':443, 'ftp':21};


    /**
     * Parses an escaped url query string into key-value pairs.
     * @returns Object.<(string|boolean)>
     */
    function parseKeyValue(/**string*/keyValue) {
        var obj = {}, key_value, key;
        angular.forEach((keyValue || "").split('&'), function (keyValue) {
            if (keyValue) {
                key_value = keyValue.split('=');
                key = decodeURIComponent(key_value[0]);
                obj[key] = angular.isDefined(key_value[1]) ? decodeURIComponent(key_value[1]) : true;
            }
        });
        return obj;
    }

    /**
     * This method is intended for encoding *key* or *value* parts of query component. We need a custom
     * method becuase encodeURIComponent is too agressive and encodes stuff that doesn't have to be
     * encoded per http://tools.ietf.org/html/rfc3986:
     *    query       = *( pchar / "/" / "?" )
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriQuery(val, pctEncodeSpaces) {
        return encodeURIComponent(val).
            replace(/%40/gi, '@').
            replace(/%3A/gi, ':').
            replace(/%24/g, '$').
            replace(/%2C/gi, ',').
            replace((pctEncodeSpaces ? null : /%20/g), '+');
    }

    /**
     * Encode path using encodeUriSegment, ignoring forward slashes
     *
     * @param {string} path Path to encode
     * @returns {string}
     */
    function encodePath(path) {
        var segments = path.split('/'),
            i = segments.length;

        while (i--) {
            segments[i] = encodeUriSegment(segments[i]);
        }

        return segments.join('/');
    }

    /**
     * We need our custom mehtod because encodeURIComponent is too agressive and doesn't follow
     * http://www.ietf.org/rfc/rfc3986.txt with regards to the character set (pchar) allowed in path
     * segments:
     *    segment       = *pchar
     *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
     *    pct-encoded   = "%" HEXDIG HEXDIG
     *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
     *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
     *                     / "*" / "+" / "," / ";" / "="
     */
    function encodeUriSegment(val) {
        return encodeUriQuery(val, true).
            replace(/%26/gi, '&').
            replace(/%3D/gi, '=').
            replace(/%2B/gi, '+');
    }

    function toKeyValue(obj) {
        var parts = [];
        angular.forEach(obj, function (value, key) {
            parts.push(encodeUriQuery(key, true) + (value === true ? '' : '=' + encodeUriQuery(value, true)));
        });
        return parts.length ? parts.join('&') : '';
    }

    function int(str) {
        return parseInt(str, 10);
    }

    function matchUrl(url, obj) {
        var match = URL_MATCH.exec(url);

        match = {
            protocol:match[1],
            host:match[3],
            port:int(match[5]) || DEFAULT_PORTS[match[1]] || null,
            path:match[6] || '/',
            search:match[8],
            hash:match[10]
        };

        if (obj) {
            obj.$$protocol = match.protocol;
            obj.$$host = match.host;
            obj.$$port = match.port;
        }

        return match;
    }


    function composeProtocolHostPort(protocol, host, port) {
        return protocol + '://' + host + (port == DEFAULT_PORTS[protocol] ? '' : ':' + port);
    }


    /**
     * Patches the angular LocationHashbangUrl service to use the url directly.
     */
    function patchLocationServiceToUsePlainUrls($location, initUrl) {

        /**
         * Parse given html5 (regular) url string into properties
         * @param {string} newAbsoluteUrl HTML5 url
         * @private
         */
        $location.$$parse = function (newAbsoluteUrl) {
            var match = matchUrl(newAbsoluteUrl, this);

            this.$$path = decodeURIComponent(match.path);
            this.$$search = parseKeyValue(match.search);
            this.$$hash = match.hash && decodeURIComponent(match.hash) || '';

            this.$$compose();
        };

        /**
         * Compose url and update `absUrl` property
         * @private
         */
        $location.$$compose = function () {
            var search = toKeyValue(this.$$search),
                hash = this.$$hash ? '#' + encodePath(this.$$hash) : '';

            this.$$url = encodePath(this.$$path) + (search ? '?' + search : '') + hash;
            this.$$absUrl = composeProtocolHostPort(this.$$protocol, this.$$host, this.$$port) +
                this.$$url;
        };

        $location.$$rewriteAppUrl = function (absoluteLinkUrl) {
            // deactivate link rewriting
            return null;
        };

        $location.$$parse(initUrl);
    }

    /**
     * This reuses the hashchange handler of jqm for angular and ensures, that angular's handler
     * is always called before the one from jqm.
     * By this, $location is always up to date when jquery mobile fires pagebeforecreate, ...
     * @param $browser
     */
    function reusejQueryMobileHashChangeForAngular($browser) {
        if ($browser.isMock) {
            return;
        }
        var urlChangeInit = false;

        var _onUrlChange = $browser.onUrlChange;
        var triggerAngularHashChange;
        $browser.onUrlChange = function (callback) {
            var res;
            if (!urlChangeInit) {
                var _bind = $.fn.bind;
                $.fn.bind = function(event, handler) {
                    triggerAngularHashChange = handler;
                };
                var res = _onUrlChange(callback);
                $.fn.bind = _bind;

                var _hashChange = $.mobile._handleHashChange;
                $.mobile._handleHashChange = function(hash) {
                    triggerAngularHashChange();
                    _hashChange(hash);
                };
                var _setPath = $.mobile.path.set;
                $.mobile.path.set = function(hash) {
                    var res = _setPath.apply(this, arguments);
                    triggerAngularHashChange();
                    return res;
                };

                urlChangeInit = true;
            } else {
                res = _onUrlChange(callback);
            }
            return res;
        };

    }

    var ng = angular.module("ng");
    ng.config(['$provide', '$locationProvider', function ($provide, $locationProvider) {
        $provide.decorator('$browser', ['$sniffer', '$delegate', function ($sniffer, $browser) {
            if ($locationProvider.jqmCompatMode()) {
                // Angular should not use the history api and use the hash bang location service,
                // which we will extend below.
                $sniffer.history = false;
                reusejQueryMobileHashChangeForAngular($browser);
            }
            return $browser;
        }]);
    }]);

    ng.config(['$locationProvider', function ($locationProvider) {
        var jqmCompatMode = true;
        /**
         * @ngdoc property
         * @name ng.$locationProvider#jqmCompatMode
         * @methodOf ng.$locationProvider
         * @description
         * @param {string=} mode Use jqm compatibility mode for navigation.
         * @returns {*} current value if used as getter or itself (chaining) if used as setter
         */
        $locationProvider.jqmCompatMode = function (mode) {
            if (angular.isDefined(mode)) {
                jqmCompatMode = mode;
                return this;
            } else {
                return jqmCompatMode;
            }
        };

        var _$get = $locationProvider.$get;
        $locationProvider.$get = ['$injector', '$browser', function ($injector, $browser) {
            if (jqmCompatMode) {
                var $location = $injector.invoke(_$get, $locationProvider);
                patchLocationServiceToUsePlainUrls($location, $browser.url());

                return $location;
            } else {
                // deactivate jqm hash listening and changing
                $.mobile.pushStateEnabled = false;
                $.mobile.hashListeningEnabled = false;
                $.mobile.changePage.defaults.changeHash = false;

                return $injector.invoke(_$get, $locationProvider);
            }
        }];

    }]);

})(angular, $);
(function ($, angular) {
    // Patch for ng-repeat to fire an event whenever the children change.
    // Only watching Scope create/destroy is not enough here, as ng-repeat
    // caches the scopes during reordering.

    function shallowEquals(collection1, collection2) {
        if (!!collection1 ^ !!collection2) {
            return false;
        }
        for (var x in collection1) {
            if (collection2[x] !== collection1[x]) {
                return false;
            }
        }
        for (var x in collection2) {
            if (collection2[x] !== collection1[x]) {
                return false;
            }
        }
        return true;
    }

    function shallowClone(collection) {
        if (!collection) {
            return collection;
        }
        var res;
        if (collection.length) {
            res = [];
        } else {
            res = {};
        }
        for (var x in collection) {
            res[x] = collection[x];
        }
        return res;
    }

    var mod = angular.module('ng');
    mod.directive('ngRepeat', function () {
        return {
            priority:1000, // same as original repeat
            compile:function (element, attr, linker) {
                return {
                    pre:function (scope, iterStartElement, attr) {
                        var expression = attr.ngRepeat;
                        var match = expression.match(/^.+in\s+(.*)\s*$/);
                        if (!match) {
                            throw Error("Expected ngRepeat in form of '_item_ in _collection_' but got '" +
                                expression + "'.");
                        }
                        var collectionExpr = match[1];
                        var lastCollection;
                        var changeCounter = 0;
                        scope.$watch(function () {
                            var collection = scope.$eval(collectionExpr);
                            if (!shallowEquals(collection, lastCollection)) {
                                lastCollection = shallowClone(collection);
                                changeCounter++;
                            }
                            return changeCounter;
                        }, function () {
                            // Note: need to be parent() as jquery cannot trigger events on comments
                            // (angular creates a comment node when using transclusion, as ng-repeat does).
                            iterStartElement.parent().trigger("$childrenChanged");
                        });
                    }
                };
            }
        };
    });
})($, angular);
(function ($, angular) {
    // This is a copy of parts of angular's ngOptions directive to detect changes in the values
    // of ngOptions (emits the $childrenChanged event on the scope).
    // This is needed as ngOptions does not provide a way to listen to changes.

    function sortedKeys(obj) {
        var keys = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys.sort();
    }

    var NG_OPTIONS_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?(?:\s+group\s+by\s+(.*))?\s+for\s+(?:([\$\w][\$\w\d]*)|(?:\(\s*([\$\w][\$\w\d]*)\s*,\s*([\$\w][\$\w\d]*)\s*\)))\s+in\s+(.*)$/;
    var mod = angular.module('ng');
    mod.directive('ngOptions', ['$parse', function ($parse) {
        return {
            require: ['select', '?ngModel'],
            link:function (scope, element, attr, ctrls) {
                // if ngModel is not defined, we don't need to do anything
                if (!ctrls[1]) return;

                var match;
                var optionsExp = attr.ngOptions;

                if (! (match = optionsExp.match(NG_OPTIONS_REGEXP))) {
                    throw Error(
                        "Expected ngOptions in form of '_select_ (as _label_)? for (_key_,)?_value_ in _collection_'" +
                            " but got '" + optionsExp + "'.");
                }

                var displayFn = $parse(match[2] || match[1]),
                    valueName = match[4] || match[6],
                    keyName = match[5],
                    groupByFn = $parse(match[3] || ''),
                    valueFn = $parse(match[2] ? match[1] : valueName),
                    valuesFn = $parse(match[7]);

                scope.$watch(optionsModel, function() {
                    element.trigger("$childrenChanged");
                }, true);

                function optionsModel() {
                    var optionGroups = [], // Temporary location for the option groups before we render them
                        optionGroupName,
                        values = valuesFn(scope) || [],
                        keys = keyName ? sortedKeys(values) : values,
                        length,
                        index,
                        locals = {};

                    // We now build up the list of options we need (we merge later)
                    for (index = 0; length = keys.length, index < length; index++) {
                        var value = values[index];
                        locals[valueName] = values[keyName ? locals[keyName]=keys[index]:index];
                        optionGroupName = groupByFn(scope, locals);
                        optionGroups.push({
                            id: keyName ? keys[index] : index,   // either the index into array or key from object
                            label: displayFn(scope, locals), // what will be seen by the user
                            optionGroup: optionGroupName
                        });
                    }
                    return optionGroups;
                }
            }
        };
    }]);


})($, angular);
(function (angular) {
    var ng = angular.module("ng");
    ng.directive('option', ['$interpolate', function ($interpolate) {
        return {
            restrict:'E',
            compile:function (tElement, tAttrs) {
                var textInterpolateFn = $interpolate(tElement.text(), true);
                var valueInterpolateFn = $interpolate(tElement.attr('value'), true);
                return function (scope, iElement, iAttrs) {
                    scope.$watch(textInterpolateFn, function () {
                        iElement.trigger("$childrenChanged");
                    });
                    scope.$watch(valueInterpolateFn, function () {
                        iElement.trigger("$childrenChanged");
                    });
                }
            }
        };
    }]);
})(angular);
(function (angular) {
    var ng = angular.module("ng");
    ng.directive('li', function() {
        return {
            restrict:'E',
            compile:function (tElement, tAttrs) {
                return function (scope, iElement, iAttrs) {
                    iElement.bind("$childrenChanged", function () {
                        iElement.removeClass("ui-li");
                        var buttonElements = iElement.data("buttonElements");
                        if (buttonElements) {
                            var text = buttonElements.text;
                            while (text.firstChild) {
                                iElement[0].appendChild(text.firstChild);
                            }
                            $(buttonElements.inner).remove();
                        }
                        iElement.removeData("buttonElements");
                    });
                }
            }
        };
    });
})(angular);
(function (angular) {
    // Patch for ng-switch to fire an event whenever the children change.

    var ng = angular.module("ng");
    ng.directive("ngSwitch",
        function () {
            return {
                restrict:'EA',
                compile:function (element, attr) {
                    var watchExpr = attr.ngSwitch || attr.on;
                    return function (scope, element) {
                        scope.$watch(watchExpr, function (value) {
                            element.trigger("$childrenChanged");
                        });
                    }
                }
            }
        });
})(angular);
(function (angular) {
    // Patch for ng-include to fire an event whenever the children change.

    var ng = angular.module("ng");
    ng.directive("ngInclude",
        function () {
            return {
                restrict:'ECA',
                compile:function (element, attr) {
                    var srcExp = attr.ngInclude || attr.src;
                    return function (scope, element) {
                        scope.$watch(srcExp, function (src) {
                            element.trigger("$childrenChanged");
                        });
                        scope.$on("$includeContentLoaded", function() {
                            element.trigger("$childrenChanged");
                        });
                    }
                }
            }
        });
})(angular);
(function ($, angular) {
    var mod = angular.module('ng');
    mod.directive("input", function () {
        return {
            restrict:'E',
            require:'?ngModel',
            compile:function (tElement, tAttrs) {
                var type = tElement.attr('type');
                return {
                    pre:function (scope, iElement, iAttrs, ctrl) {
                        if (!ctrl) {
                            return;
                        }
                        var listenToEvents = [];
                        if (type === 'date') {
                            // Angular binds to the input or keydown+change event.
                            // However, date inputs on IOS5 do not fire any of those (only the blur event).
                            // See ios5 bug TODO
                            listenToEvents.push("blur");
                        }
                        // always bind to the change event, if angular would only listen to the "input" event.
                        // Needed as jqm often fires change events when the input widgets change...
                        listenToEvents.push("change");

                        var _bind = iElement.bind;
                        iElement.bind = function (events, callback) {
                            if (events.indexOf('input') != -1 || events.indexOf('change') != -1) {
                                for (var i=0; i<listenToEvents.length; i++) {
                                    var event = listenToEvents[i];
                                    if (events.indexOf(event)===-1) {
                                        events+=" "+event;
                                    }
                                }
                            }
                            return _bind.call(this, events, callback);
                        };
                    }
                }
            }
        };

    });
})($, angular);


(function (angular) {
    /*
     * Defines the ng:if tag. This is useful if jquery mobile does not allow
     * an ng-switch element in the dom, e.g. between ul and li.
     */
    var ngIfDirective = {
        transclude:'element',
        priority:1000,
        terminal:true,
        compile:function (element, attr, linker) {
            return function (scope, iterStartElement, attr) {
                iterStartElement[0].doNotMove = true;
                var expression = attr.ngmIf;
                var lastElement;
                var lastScope;
                scope.$watch(expression, function (newValue) {
                    if (lastElement) {
                        lastElement.remove();
                        lastElement = null;
                    }
                    lastScope && lastScope.$destroy();
                    if (newValue) {
                        lastScope = scope.$new();
                        linker(lastScope, function (clone) {
                            lastElement = clone;
                            iterStartElement.after(clone);
                        });
                    }
                    // Note: need to be parent() as jquery cannot trigger events on comments
                    // (angular creates a comment node when using transclusion, as ng-repeat does).
                    iterStartElement.parent().trigger("$childrenChanged");
                });
            };
        }
    };
    var ng = angular.module('ng');
    ng.directive('ngmIf', function () {
        return ngIfDirective;
    });
})(angular);

(function (angular) {
    var mod = angular.module('ng');

    function registerEventHandler(scope, element, eventType, handler) {
        element.bind(eventType, function (event) {
            var res = scope.$apply(handler, element);
            if (eventType.charAt(0) == 'v') {
                // This is required to prevent a second
                // click event, see
                // https://github.com/jquery/jquery-mobile/issues/1787
                event.preventDefault();
            }
        });
    }

    function createEventDirective(directive, eventType) {
        mod.directive(directive, function () {
            return function (scope, element,attrs) {
                var eventHandler = attrs[directive];
                registerEventHandler(scope, element, eventType, eventHandler);
            };
        });
    }

    var eventDirectives = {ngmTaphold:'taphold', ngmSwipe:'swipe', ngmSwiperight:'swiperight',
        ngmSwipeleft:'swipeleft',
        ngmPagebeforeshow:'pagebeforeshow',
        ngmPagebeforehide:'pagebeforehide',
        ngmPageshow:'pageshow',
        ngmPagehide:'pagehide',
        ngmClick:'vclick'
    };
    for (var directive in eventDirectives) {
        createEventDirective(directive, eventDirectives[directive])
    }

})(angular);
(function($, angular) {
    function splitAtFirstColon(value) {
        var pos = value.indexOf(':');
        if (pos===-1) {
            return [value];
        }
        return [
            value.substring(0, pos),
            value.substring(pos+1)
        ];
    }

    function instrumentUrlHistoryToSavePageId() {
        var lastToPage;
        $(document).on("pagebeforechange", function(event, data) {
            if (typeof data.toPage === "object") {
                lastToPage = data.toPage;
            }
        });
        var urlHistory = $.mobile.urlHistory;
        var _addNew = urlHistory.addNew;
        urlHistory.addNew = function() {
            var res = _addNew.apply(this, arguments);
            var lastEntry = urlHistory.stack[urlHistory.stack.length-1];
            lastEntry.pageId = lastToPage.attr("id");
            return res;
        }
    }
    instrumentUrlHistoryToSavePageId();

    function getNavigateIndexInHistory(pageId) {
        var urlHistory = $.mobile.urlHistory;
        var activeIndex = urlHistory.activeIndex;
        var stack = $.mobile.urlHistory.stack;
        for (var i = stack.length - 1; i >= 0; i--) {
            if (i!==activeIndex && stack[i].pageId === pageId) {
                return i - activeIndex;
            }
        }
        return undefined;
    }

    function callActivateFnOnPageChange(fnName, params) {
        if (fnName) {
            $(document).one("pagebeforechange", function(event, data) {
                var toPageUrl = $.mobile.path.parseUrl( data.toPage );
                var page = $("#"+toPageUrl.hash.substring(1));
                function executeCall() {
                    var scope = page.scope();
                    scope[fnName].apply(scope, params);
                }
                if (!page.data("page")) {
                    page.one("pagecreate", executeCall);
                    return;
                }
                executeCall();
            });
        }
    }

    /*
     * Service for page navigation.
     * @param target has the syntax: [<transition>:]pageId
     * @param activateFunctionName Function to call in the target scope.
     * @param further params Parameters for the function that should be called in the target scope.
     */
    function navigate(target, activateFunctionName) {
        var activateParams = Array.prototype.slice.call(arguments, 2);
        callActivateFnOnPageChange(activateFunctionName, activateParams);
        var navigateOptions;
        if (typeof target === 'object') {
            navigateOptions = target;
            target = navigateOptions.target;
        }
        var parts = splitAtFirstColon(target);
        var isBack = false;
        if (parts.length === 2 && parts[0] === 'back') {
            isBack = true;
            target = parts[1];
        } else if (parts.length === 2) {
            navigateOptions = { transition: parts[0] };
            target = parts[1];
        }
        if (target === 'back') {
            window.history.go(-1);
            return;
        }
        if (isBack) {
            // The page may be removed from the DOM by the cache handling
            // of jquery mobile.
            $.mobile.loadPage(target, {showLoadMsg: true}).then(function(_a,_b,page) {
                var relativeIndex = getNavigateIndexInHistory(page.attr("id"));
                if (relativeIndex!==undefined) {
                    window.history.go(relativeIndex);
                } else {
                    jqmChangePage(target, {reverse: true});
                }
            });
        } else {
            jqmChangePage(target, navigateOptions);
        }
    }

    function jqmChangePage(target, navigateOptions) {
        if (navigateOptions) {
            $.mobile.changePage(target, navigateOptions);
        } else {
            $.mobile.changePage(target);
        }
    }


    var mod = angular.module('ng');
    mod.factory('$navigate', function() {
        return navigate;
    });



    return navigate;

})($, angular);
(function(angular) {
    var storageName = '$$sharedControllers';

    function storage(rootScope) {
        return rootScope[storageName] = rootScope[storageName] || {};
    }

    function sharedCtrl(rootScope, controllerName, $controller, usedInPage) {
        var store = storage(rootScope);
        var scopeInstance = store[controllerName];
        if (!scopeInstance) {
            scopeInstance = rootScope.$new();
            $controller(controllerName, {$scope: scopeInstance});
            store[controllerName] = scopeInstance;
            scopeInstance.$$referenceCount = 0;
        }
        scopeInstance.$$referenceCount++;
        usedInPage.bind("$destroy", function() {
            scopeInstance.$$referenceCount--;
            if (scopeInstance.$$referenceCount===0) {
                scopeInstance.$destroy();
                delete store[controllerName];
            }
        });
        return scopeInstance;
    }

    function parseSharedControllersExpression(expression) {
        var pattern = /([^\s,:]+)\s*:\s*([^\s,:]+)/g;
        var match;
        var hasData = false;
        var controllers = {};
        while (match = pattern.exec(expression)) {
            hasData = true;
            controllers[match[1]] = match[2];
        }
        if (!hasData) {
            throw "Expression " + expression + " needs to have the syntax <name>:<controller>,...";
        }
        return controllers;
    }

    var mod = angular.module('ng');
    mod.directive('ngmSharedController', ['$controller', function($controller) {
        return {
            scope: true,
            compile: function(element, attrs) {
                var expression = attrs.ngmSharedController;
                var controllers = parseSharedControllersExpression(expression);
                var preLink = function(scope) {
                    for (var name in controllers) {
                        scope[name] = sharedCtrl(scope.$root, controllers[name], $controller, element);
                    }
                };
                return {
                    pre: preLink
                }
            }
        };
    }]);
})(angular);
(function($, angular) {
    var showCalls = [];

    function onClick(event) {
        var lastCall = showCalls[showCalls.length - 1];
        if (lastCall.callback) {
            rootScope.$apply(function() {
                lastCall.callback.apply(this, arguments);
            });
        }
        // This is required to prevent a second
        // click event, see
        // https://github.com/jquery/jquery-mobile/issues/1787
        event.preventDefault();
    }

    var loadDialog;

    function initIfNeeded() {
        if (!loadDialog || loadDialog.length == 0) {
            loadDialog = $(".ui-loader");
            loadDialog.bind('vclick', onClick);
        }
    }

    if (!$.mobile.loadingMessageWithCancel) {
        $.mobile.loadingMessageWithCancel = 'Loading. Click to cancel.';
    }

    function updateUi() {
        initIfNeeded();
        if (showCalls.length > 0) {
            var lastCall = showCalls[showCalls.length - 1];
            var msg = lastCall.msg;
            var oldMessage = $.mobile.loadingMessage;
            var oldTextVisible = $.mobile.loadingMessageTextVisible;
            if (msg) {
                $.mobile.loadingMessage = msg;
                $.mobile.loadingMessageTextVisible = true;
            }
            $.mobile.showPageLoadingMsg();
            $.mobile.loadingMessageTextVisible = oldTextVisible;
            $.mobile.loadingMessage = oldMessage;
        } else {
            $.mobile.hidePageLoadingMsg();
        }
    }

    /**
     * jquery mobile hides the wait dialog when pages are transitioned.
     * This immediately closes wait dialogs that are opened in the pagebeforeshow event.
     */
    $('div').live('pageshow', function(event, ui) {
        updateUi();
    });

    /**
     *
     * @param msg (optional)
     * @param tapCallback (optional)
     */
    function show() {
        var msg, tapCallback;
        if (typeof arguments[0] == 'string') {
            msg = arguments[0];
        }
        if (typeof arguments[0] == 'function') {
            tapCallback = arguments[0];
        }
        if (typeof arguments[1] == 'function') {
            tapCallback = arguments[1];
        }

        showCalls.push({msg: msg, callback: tapCallback});
        updateUi();
    }

    function hide() {
        showCalls.pop();
        updateUi();
    }

    function always(promise, callback) {
        promise.then(callback, callback);
    }

    /**
     *
     * @param promise
     * @param msg (optional)
     */
    function waitFor(promise, msg) {
        show(msg);
        always(promise, function() {
            hide();
        });
    }

    /**
     *
     * @param deferred
     * @param cancelData
     * @param msg (optional)
     */
    function waitForWithCancel(deferred, cancelData, msg) {
        if (!msg) {
            msg = $.mobile.loadingMessageWithCancel;
        }
        show(msg, function() {
            deferred.reject(cancelData);
        });
        always(deferred.promise, function() {
            hide();
        });
    }

    var res = {
        show: show,
        hide: hide,
        waitFor: waitFor,
        waitForWithCancel:waitForWithCancel
    };

    var mod = angular.module('ng');
    var rootScope;
    mod.factory('$waitDialog', ['$rootScope', function($rootScope) {
        rootScope = $rootScope;
        return res;
    }]);

    return res;
})($, angular);
(function ($, angular) {

    function pagedListFilterFactory(defaultListPageSize, filterFilter, orderByFilter) {

        function createPagedList(list) {
            var enhanceFunctions = {
                refreshIfNeeded:refreshIfNeeded,
                setFilter:setFilter,
                setOrderBy:setOrderBy,
                setPageSize:setPageSize,
                loadNextPage:loadNextPage,
                hasMorePages:hasMorePages,
                reset:reset,
                refreshCount:0
            };

            var pagedList = [];
            var pageSize, originalList, originalListClone, refreshNeeded, filter, orderBy, loadedCount, availableCount;

            for (var fnName in enhanceFunctions) {
                pagedList[fnName] = enhanceFunctions[fnName];
            }
            init(list);
            var oldHasOwnProperty = pagedList.hasOwnProperty;
            pagedList.hasOwnProperty = function (propName) {
                if (propName in enhanceFunctions) {
                    return false;
                }
                return oldHasOwnProperty.apply(this, arguments);
            };
            return pagedList;

            function init(list) {
                setPageSize(-1);
                originalList = list;
                originalListClone = [];
                refreshNeeded = true;
                reset();
            }

            function refresh() {
                var list = originalList;
                originalListClone = [].concat(list);
                if (filter) {
                    list = filterFilter(list, filter);
                }
                if (orderBy) {
                    list = orderByFilter(list, orderBy);
                }
                if (loadedCount < pageSize) {
                    loadedCount = pageSize;
                }
                if (loadedCount > list.length) {
                    loadedCount = list.length;
                }
                availableCount = list.length;
                var newData = list.slice(0, loadedCount);
                var spliceArgs = [0, pagedList.length].concat(newData);
                pagedList.splice.apply(pagedList, spliceArgs);
                pagedList.refreshCount++;
            }

            function refreshIfNeeded() {
                if (originalList.length != originalListClone.length) {
                    refreshNeeded = true;
                } else {
                    for (var i = 0; i < originalList.length; i++) {
                        if (originalList[i] !== originalListClone[i]) {
                            refreshNeeded = true;
                            break;
                        }
                    }
                }
                if (refreshNeeded) {
                    refresh();
                    refreshNeeded = false;
                }
                return pagedList;
            }

            function setPageSize(newPageSize) {
                if (!newPageSize || newPageSize < 0) {
                    newPageSize = defaultListPageSize;
                }
                if (newPageSize !== pageSize) {
                    pageSize = newPageSize;
                    refreshNeeded = true;
                }
            }

            function setFilter(newFilter) {
                if (!angular.equals(filter, newFilter)) {
                    filter = newFilter;
                    refreshNeeded = true;
                }
            }

            function setOrderBy(newOrderBy) {
                if (!angular.equals(orderBy, newOrderBy)) {
                    orderBy = newOrderBy;
                    refreshNeeded = true;
                }
            }

            function loadNextPage() {
                loadedCount = loadedCount + pageSize;
                refreshNeeded = true;
            }

            function hasMorePages() {
                refreshIfNeeded();
                return loadedCount < availableCount;
            }

            function reset() {
                loadedCount = 0;
                refreshNeeded = true;
            }
        }

        return function (list, param) {
            if (!list) {
                return list;
            }
            var pagedList = list.pagedList;
            if (typeof param === 'string') {
                if (!pagedList) {
                    return;
                }
                // commands do not create a new paged list nor do they change the attributes of the list.
                if (param === 'loadMore') {
                    pagedList.loadNextPage();
                } else if (param === 'hasMore') {
                    return pagedList.hasMorePages();
                }
                return;
            }
            if (!pagedList) {
                pagedList = createPagedList(list);
                list.pagedList = pagedList;
            }
            if (param) {
                pagedList.setPageSize(param.pageSize);
                pagedList.setFilter(param.filter);
                pagedList.setOrderBy(param.orderBy);
            }
            pagedList.refreshIfNeeded();
            return pagedList;
        };
    }

    pagedListFilterFactory.$inject = ['defaultListPageSize', 'filterFilter', 'orderByFilter'];
    var mod = angular.module(['ng']);
    mod.constant('defaultListPageSize', 10);
    mod.filter('paged', pagedListFilterFactory);
})($, angular);
});