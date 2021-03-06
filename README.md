ptemplate
=========

JQuery plugin for Javascript templating. 2.6k minified. 
Supports fields, filters, conditionals, and loops.
Uses plain HTML templates.
Requires jQuery.


Usage:
------
    $('.my_template').fillInWith(data)  <-- returns a jquery containing the filled-in template

    ...where 'my_template' points at some markup to use as a template, and data is an object.

Templates:
----------
Just some HTML with template elements. Typically a hidden div on your page.

      <div class="my_template" style="display:none">
         My name is [[name]] and I have [[animals|count]] [[species]][[animals|count|sIfPlural]]:
         <div data-repeat-on="animals">
             <span data-if="loop_last"> and </span>
             [[name]] who weighs [[weight]] pound[[weight|sIfPlural]]
             <span data-if="loop_notlast">,</span>
         </div>
         <span data-if="animals.length>3">
             I have too many animals
             <span data-else="true"> I don't have too many animals</span>
         </span>
      </div>

  - Fields go in double-brackets: \[\[fieldname\]\] (no spaces!).
  
  - Filters are marked with '|'. Built-in filters are count() and sIfPlural(). You can add more 
    with the extraFilters option (see below).

  - Repeating elements are marked with data-repeat-on attribute, which should match the name of an
    array in your data.
  
  - Conditionals are marked with data-if and data-else. Use conditionals ONLY with trusted data as
    they use javascript eval() (there's an option to indicate untrusted data, below).
  
  - Supports loop variables loop_first, loop_last, loop_notlast, loop_notfirst, loop_multiple



Data
----
A js object:

     var data = {
         species: 'moose',
         animals: [
             {weight:300, name:'Bill'},
             {weight:100, name:'Sam'},
             {weight:120, name:'Heidi'}
         ],
         'name':'Buddy'};

  - Data can contain arrays of other objects (e.g. 'animals', above.


Options (all optional):
-----------------------
  - extraFilters: an object containing functions that you can use as filters. Filters
    should take a single argument and return a string or number.

  - ldelim, rdelim: delimiters for fields; default to '[[' and ']]'

  - debug: if true, then some errors will be reported in the console

  - untrusted: If true, then 'if' conditions won't be evaluated (can't evaluate without eval()). Set if you may
    be using untrustworthy (e.g. user-supplied) data in your templates.

  - inPlace: If true, then the template will be modified in place. The default is to return a copy and
    leave the original template untouched.

