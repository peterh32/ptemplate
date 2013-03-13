ptemplate
=========

JQuery plugin for Javascript templating. 
Supports fields, filters, conditionals, and loops.
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
         <ol>
             <li data-repeat-on="animals">
                 [[name]] who weighs [[weight]] pound[[weight|sIfPlural]]
             </li>
         </ol>
         <span data-if="animals.length>3">
             I have too many animals
             <span data-else="true"> I don't have too many animals</span>
         </span>
      </div>

  - Fields go in double-brackets: \[\[fieldname\]\] (no spaces!).
  
  - Repeating elements are marked with data-repeat-on attribute, which should match the name of an
    array in your data.
  
  - Conditionals are marked with data-if and data-else. Use conditionals ONLY with trusted data as
    they use javascript eval() (there's an option to indicate untrusted data, below).
  
  - Filters are marked with '|'. Built-in: count and sIfPlural. You can add more in extraFilters
    option (see below).


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

