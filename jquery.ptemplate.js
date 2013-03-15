/**
 *  pTemplate
 *      Javascript templating using HTML templates. Supports fields, loops, conditionals, and filters.
 *
 *  Usage:
 *      $('.my_template').fillInWith(data, options)  <-- returns a jquery containing the filled-in template
 *
 *  Options (all optional):
 *      ldelim, rdelim, debug, trusted, inPlace, and extraFilters
 *
 *  See readme for more
 */

var pTemplateDefaults, pTemplateAddFilters;  // global functions for setting defaults

(function( $ ){
    var defaults = {
        ldelim: '[[',   // field delimiters
        rdelim: ']]',
        debug: false,   // display debug info in console
        trusted: false, // data is trusted (not from users) so ok to allow expressions on conditionals (allows js eval() on data)
        inPlace: false,  // fill out the template in place instead of making a clone
        extraFilters: {} // lets you add functions to use as filters
    };

    // set defaults
    pTemplateDefaults = function(options){
        $.extend(defaults, options);
    }

    // add default filters
    pTemplateAddFilters = function(newFilters){
        if (typeof newFilters == 'object'){
            $.extend(defaultFilters, newFilters);
        }
    }

    // built-in filters
    var defaultFilters = {
        // return 's' if value != 1 or -1
        sIfPlural: function(value){
            var test = parseFloat(value);
            return (test == -1 || test == 1) ? '' : 's';
        },
        // return length, e.g. of an array (or a string, though I don't know why you'd want that)
        count: function(value){
            return value && (value.length || 0);
        }
        // also 'safe', which is not really a filter but turns off the safeText cleanup for that field.
    };


    $.fn.fillInWith = function(data, options){
        options = $.extend({}, defaults, options || {})

        // set up debug
        var errors = function(){};
        if (options.debug && typeof console == 'object'){
            errors =  function(msg){console.log('pTemplate msg: ' + msg)};
        }
        errors('Debug is on.');

        // check data
        if (typeof data != 'object' || $.isArray(data)){
            errors('Data passed to fillInWith() must be an object and not an array');
            return this;
        }

        // get filters
        var filters = $.extend({}, defaultFilters, options.extraFilters || {});

        // what to do when a field in the template has no match in the data
        var badField = function(fieldName){
            errors('Cannot find ' + fieldName + ' in data');
            return '';
        };

        // function to clean up text data before inserting
        var safeText =  function(fieldData){
            if (typeof fieldData == 'string'){
                fieldData = fieldData.replace('<', '&lt;');
            }
            return fieldData;
        }

        // if inPlace is true, then overwrite the original template. Otherwise, make a clone
        if (options.inPlace){
            var $template = this;         // overwrite the original template
        } else {
            var $template = this.clone(); // don't overwrite the original template
        }

        // evaluate the ifs at the current level
        var evalIfs = function($elem, data, loop){
            loop = loop || {};
            // find each array...
            for (item in data){
                if (data.hasOwnProperty(item) && $.isArray(data[item])){
                    // ... and its accompanying data-repeat block
                    var $sect = $elem.find('[data-repeat-on="' + item + '"]');
                    // hide the data-if's in each block as we don't want to evaluate them until we get to that loop
                    $sect.find('[data-if]').addClass('ptemplate_hide');
                }
            }
            // for each non-hidden data-if block, evaluate the conditional
            $elem.find('[data-if]').not('.ptemplate_hide').each(function(){
                var $else = $(this).find('[data-else]');
                var keep;
                var testExp = $(this).attr('data-if');
                // If options.trusted is true, this will handle expressions (using eval()) as well as field names.
                // Otherwise, will only evaluate if a variable is truthy within the current data context
                if (options.trusted){
                    with(data){
                        try{keep = loop[testExp] || eval(testExp);}
                        catch(err){keep = false;}
                    }
                } else {
                    keep = data[testExp] || loop[testExp];
                }
                if (keep){
                    $else.remove();
                    $(this).removeAttr('data-if');
                } else {
                    $else.removeAttr('data-else');
                    $(this).replaceWith($else);
                    if (options.debug && !options.trusted && testExp != escape(testExp)){
                        errors('"' + testExp + '" may not be a valid If condition when "trusted" option not set.')
                    }
                }
            });
            // restore the hidden blocks
            $elem.find('.ptemplate_hide').removeClass('ptemplate_hide');
            return $elem;
        };

        // the main function - returns a jquery of the completed template
        var main = function($elem, data, loop){
            // data needs to be an object not an array
            if (typeof data != 'object' || $.isArray(data)){
                errors('Data structure problem: ' + typeof data + ' passed to main');
                return $elem;
            }

            // Do the conditionals at this level
            $elem = evalIfs($elem, data, loop);

            // Recursion for arrays
            for (var item in data){
                if (data.hasOwnProperty(item) && $.isArray(data[item])){
                    // If it's an array, find matching repeat-on element in the markup.
                    // Grab that element as template. Replace with set of new elements
                    var theArray = data[item];
                    var loop = {};
                    loop.length = theArray.length;
                    loop.loop_multiple = (loop.length > 1);
                    var $replace = $elem.find('[data-repeat-on="' + item + '"]');
                    if ($replace.length == 1){
                        var $target = $replace.parent();
                        for (var i=0; i<theArray.length; i++){
                            loop.loop_first = (i == 0);
                            loop.loop_notfirst = (!loop.loop_first);
                            loop.loop_last = (i == theArray.length - 1);
                            loop.loop_notlast = (!loop.loop_last);
                            if (typeof theArray[i] == 'object'){
                                var newData = theArray[i];
                            } else {
                                var newData = {'this': theArray[i]};
                            }
                            var $template = $replace.clone().removeAttr('data-repeat-on');
                            var $result = main($template, newData, loop);     // recursion!
                            $target.append($result);
                        }
                        $replace.remove();

                    } else {
                        errors('Array "' + item + '" not used');
                    }
                }
            }

            // Do the actual field substitutions
            var elemHtml = $elem.html();

            // split into segments by '[[', so each segment (except maybe the first) starts with a field name
            var segments = elemHtml.split(options.ldelim);

            // pull off the first segment if it does not contain a field (if it does not contain ']]')
            var segmentZero = '';
            if (segments[0].indexOf(options.rdelim) == -1){
                segmentZero = segments.shift();
            }

            // go through the segments and split to extract the tag
            for (var i=0; i<segments.length; i++){
                var tag_and_text = segments[i].split(options.rdelim);
                var replacement;  // we will replace the field with this value

                // split the tag to get filters, if any
                var field_and_filters = tag_and_text[0].split('|');
                if (field_and_filters.length > 1){
                    var theField = field_and_filters.shift();
                    var safe = false;
                    replacement = data[theField] || badField(theField);

                    // go through the filters from left to right
                    for (var j=0; j<field_and_filters.length; j++){
                        var filterName = field_and_filters[j];
                        if  (typeof filters[filterName] == 'function' ){

                            // apply the filter
                            var filter = filters[filterName];
                            replacement = filter(replacement);
                        } else if (filterName == 'safe'){
                            // special handling of the 'safe' filter
                            safe = true;
                        } else {
                            errors(filterName + ' is not a valid filter');
                        }
                    }
                    if (!safe){
                        replacement = safeText(replacement);
                    }
                } else {
                    var theField = field_and_filters[0];
                    replacement = data[theField] || badField(theField);
                    replacement = safeText(replacement);
                }
                segments[i] = [replacement, tag_and_text[1] || ''].join('');
            }
            // add segmentZero onto the front again
            segments.unshift(segmentZero);

            // hook everything up
            elemHtml = segments.join('');

            // swap in the new html and return
            return $elem.html(elemHtml);
        };
        return main($template, data);
    };
})( jQuery );
