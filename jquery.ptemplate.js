/**
 *  pTemplate javascript templating
 *
 *  Usage:
 *      $('.my_template').fillInWith(data)  <-- returns a jquery containing the filled-in template
 *
 *      ...where 'my_template' points at some markup to use as a template, and data is an object.
 *
 *      Example Template:
 *            <div class="my_template">
 *               My name is [[name]] and I have [[animals|count]] [[species]][[animals|count|sIfPlural]]:
 *               <ol>
 *                   <li data-repeat-on="animals">
 *                       [[name]] who weighs [[weight]] pound[[weight|sIfPlural]]
 *                   </li>
 *               </ol>
 *               <span data-if="animals.length>3">
 *                   I have too many animals
 *                   <span data-else="true"> I don't have too many animals</span>
 *               </span>
 *            </div>
 *
 *      - Fields go in double-brackets: [[fieldname]] (no spaces!).
 *
 *      - Repeating elements are marked with data-repeat-on attribute, which should match the name of an
 *        array in your data.
 *
 *      - Conditionals are marked with data-if and data-else. Use conditionals ONLY with trusted data as
 *        they use javascript eval() (there's an option to indicate untrusted data, below).
 *
 *      - Filters are marked with '|'. Built-in: count and sIfPlural. You can add more in extraFilters
 *        option (see below).
 *
 *
 *      Example Data:
 *           var data = {
 *               species: 'moose',
 *               animals: [
 *                   {weight:300, name:'Bill'},
 *                   {weight:100, name:'Sam'},
 *                   {weight:120, name:'Heidi'}
 *               ],
 *               'name':'Buddy'};
 *
 *      - Data can contain arrays of other objects (e.g. 'animals', above.
 *
 *
 *  Options are optional:
 *      extraFilters: an object containing functions that you can use as filters. Filters
 *      should take a single argument and return a string or number.
 *
 *      ldelim, rdelim: delimiters for fields; default to '[[' and ']]'
 *
 *      debug: if true, then some errors will be reported in the console
 *
 *      untrusted: If true, then 'if' conditions won't be evaluated (can't evaluate without eval()). Set if you may
 *      be using untrustworthy (e.g. user-supplied) data in your templates.
 *
 *      inPlace: If true, then the template will be modified in place. The default is to return a copy and
 *      leave the original template untouched.
 *
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

        // Part Three: do the actual substitutions
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
                replacement = data[theField] || badField(theField);
                // go through the filters from left to right
                for (var j=0; j<field_and_filters.length; j++){
                    if  (typeof filters[field_and_filters[j]] == 'function' ){
                        // apply the filter
                        var filter = filters[field_and_filters[j]];
                        replacement = filter(replacement);
                    } else {
                        debug(field_and_filters[j] + ' is not a valid filter');
                    }
                }
            } else {
                var theField = field_and_filters[0];
                replacement = data[theField] || badField(theField);
            }
            segments[i] = [replacement, tag_and_text[1] || ''].join('');
        }
        segments.unshift(segmentZero);
        elemHtml = segments.join('');
        return $elem.html(elemHtml); // swap in the new html and return
    };
    return main($template, data);
};
