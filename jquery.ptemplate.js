/**
 *  pTemplate javascript templating
 *
 *  Usage:
 *      $('.my_template').fillInWith(data)  <-- returns a jquery containing the filled-in template
 *
 *  See readme for more
 */
$.fn.fillInWith = function(data, options){
    var options = options || {};
    // set up debug
    var debug = function(){};
    if (options.debug && typeof console == 'object'){
        debug =  function(msg){console.log('pTemplate error: ' + msg)};
    }
    // check data
    if (typeof data != 'object' || $.isArray(data)){
        debug('Data passed to fillInWith() must be an object and not an array');
        return $(this);
    }
    var ldelim = options.ldelim || '[[';
    var rdelim = options.rdelim ||']]';
    var badField = function(fieldName){
        debug('Cannot find ' + fieldName + ' in data');
        return '';
    };
    var safeText = options.safeText || function(fieldData){
        if (typeof fieldData == 'string'){
            fieldData = fieldData.replace('<', '&lt;');
        }
        return fieldData;
    }

    if (options.inPlace){
        var $template = $(this);         // overwrite the original template
    } else {
        var $template = $(this).clone(); // don't overwrite the original template
    }


    // some starter filters
    var filters = {
        // return 's' if value != 1 or -1
        sIfPlural: function(value){
            var test = parseFloat(value);
            return (test == -1 || test == 1) ? '' : 's';
        },
        // return length, e.g. of an array (or a string, though I don't know why you'd want that)
        count: function(value){
            return value && (value.length || 0);
        }
        // also 'safe', which is not really a filter but turns off the safeText clean up for that field.
    };
    $.extend(filters, options.extraFilters || {});

    // the main iterator - returns a jquery
    var main = function($elem, data){
        // data needs to be an object not an array
        if (typeof data != 'object' || $.isArray(data)){
            debug('Data structure problem: ' + typeof data + ' passed to main');
            return $elem;
        }

        // Part One: recursion for arrays
        for (var item in data){
            if (data.hasOwnProperty(item) && $.isArray(data[item])){
                // If it's an array, find matching repeat-on element.
                // Grab that element as template. Replace with set of new elements
                var theArray = data[item];
                var $replace = $elem.find('[data-repeat-on="' + item + '"]');
                if ($replace.length == 1){
                    var $target = $replace.parent();
                    for (var i=0; i<theArray.length; i++){
                        if (typeof theArray[i] == 'object'){
                            var $template = $replace.clone().removeAttr('data-repeat-on');
                            var $result = main($template, theArray[i]);
                            $target.append($result);
                        } else {
                            debug('Data structure problem. ' + item + '[' + i + '] is a ' + typeof theArray[i] + ' not an object');
                        }
                    }
                    $replace.remove();

                } else {
                    debug("There is no repeat-on element for array: " + item);
                }
            }
        }

        // Part Two: deal with conditionals
        // This uses 'with()', which can lead to confusion if you reference a
        // variable name that's not in data but IS in the global scope.
        // Also it uses eval() and so is turned off if untrusted option set
        $elem.find('[data-if]').each(function(){
            if (options.untrusted){
                debug('Untrusted option set; "data-if" conditional will not be evaluated');
            } else {
                var $else = $(this).find('[data-else]');
                var keep;
                with(data){
                    keep = eval($(this).attr('data-if'));
                }
                if (keep){
                    $else.remove();
                } else {
                    $(this).replaceWith($else);
                }
            }
        });

        // Part Three: do the actual field substitutions
        var elemHtml = $elem.html();
        var segments = elemHtml.split(ldelim);

        // pull off the first segment if it does not contain a field
        var segmentZero = '';
        if (segments[0].indexOf(rdelim) == -1){
            segmentZero = segments.shift();
        }

        // go through the segments and split to extract the tag
        for (var i=0; i<segments.length; i++){
            var tag_and_text = segments[i].split(rdelim);
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
                        safe = true;
                    } else {
                        debug(filterName + ' is not a valid filter');
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
        segments.unshift(segmentZero);
        elemHtml = segments.join('');
        return $elem.html(elemHtml); // swap in the new html and return
    };
    return main($template, data);
};
