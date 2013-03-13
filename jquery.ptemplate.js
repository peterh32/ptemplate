/**
 *  pTemplate javascript templating
 *
 *  Usage (see also example html page at the bottom of this file)
 *      Load script:
 *      <script src="[...]/jquery.ptemplate.js"></script>
 *      (requires jquery)
 *
 *      Create an html file containing markup to use as a template. Here's an example:
 *            <div class="my_template">
 *               My name is [[name]] and I have [[animals|count]] [[animal]][[animals|count|sIfPlural]]:
 *               <ol>
 *                   <li data-repeat-on="animals">
 *                       [[name]] who weighs [[weight]] pound[[weight|sIfPlural]]
 *                   </li>
 *               </ol>
 *            </div>
 *
 *      Fields go in double-brackets: [[fieldname]] (no spaces!).
 *      Repeating elements are marked with data-repeat-on attribute, which should match the name of an array in your data.
 *      Supported filters: count, sIfPlural, plus any you want to add in extraFilters option (see below).
 *
 *
 *      Create some data:
 *           var data = {
 *               animal: 'moose',
 *               animals: [
 *                   {weight:300, name:'Bill'},
 *                   {weight:100, name:'Sam'},
 *                   {weight:120, name:'Heidi'}
 *               ],
 *               'name':'Buddy'};
 *
 *      Data needs to be an object. It can contain arrays of other objects.
 *
 *      Then use the data to fill in the template:
 *          $('.my_template').fillInWith(data) <-- returns a jQuery with the filled-in template
 *
 *
 *  Options are optional:
 *      extraFilters: an object containing functions that you can use as filters. These filters
 *          should take a single argument and return a string or number.
 *
 *      ldelim, rdelim: delimiters for fields; default to '[[' and ']]'
 *
 *      debug: if true, then some errors will be reported in the console
 *
 */
$.fn.fillInWith = function(data, options){
    // turn debug on if selected in options
    var debug =  options.debug && typeof console == 'object' && function(msg){console.log('pTemplate error: ' + msg)};
    if (typeof data != 'object' || $.isArray(data)){
        debug('Data passed to fillInWith() must be an object and not an array')
        return $(this)
    }
    var options = options || {};
    var $template = $(this).clone(); // don't overwrite the original template
    var ldelim = options.ldelim || '[[';
    var rdelim = options.rdelim ||']]';
    var badField = function(fieldName){
        debug('Cannot find ' + fieldName + ' in data');
        return '';
    };

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
            return $elem
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
                            $target.append($result)
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

        // Part Two: do the actual substitutions
        var elemHtml = $elem.html();
        var segments = elemHtml.split(ldelim);

        // pull off the first segment if it does not contain a field
        var segmentZero = ''
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
                        debug(field_and_filters[j] + ' is not a valid filter')
                    }
                }
            } else {
                var theField = field_and_filters[0]
                replacement = data[theField] || badField(theField);
            }
            segments[i] = [replacement, tag_and_text[1] || ''].join('');
        }
        segments.unshift(segmentZero)
        elemHtml = segments.join('');
        return $elem.html(elemHtml); // swap in the new html and return
    }
    return main($template, data)
}

/***    Sample HTML file

<html>
<head>
    <title>pTemplate Test Page</title>
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
    <script src="jquery.ptemplate.js"></script>
    <script>
        var data = {
            animal: 'moose',
            animals: [
                {weight:300, name:'Bill'},
                {weight:100, name:'Sam'},
                {weight:120, name:'Heidi'}
            ],
            'name':'Pedro'
        };

        $(function(){
            // load the template and fill in the data
            var results = $('.my_template').fillInWith(data);
            // nuke the template class
            results.removeClass('my_template');
            // make it visible
            $('body').append(results);
            results.show();
        });
    </script>
</head>
<body>
<div class="my_template" style="display:none">
    My name is [[name]] and I have [[animals|count]] [[animal]][[animals|count|sIfPlural]]:
    <ul>
        <li data-repeat-on="animals">
            [[name]] who weighs [[weight]] pound[[weight|sIfPlural]]
        </li>
    </ul>
</div>

</body>
</html>

 **/
