/*
 * Facebox (for jQuery)
 * version: 1.3
 * @requires jQuery v1.2 or later
 *
 * @homepage https://github.com/defunkt/facebox
 *
 * Licensed under the MIT:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright Forever Chris Wanstrath, Kyle Neath
 *
 * Usage:
 *
 *  jQuery(document).ready(function() {
 *    jQuery('a[rel*=facebox]').facebox()
 *  })
 *
 *  <a href="#terms" rel="facebox">Terms</a>
 *    Loads the #terms div in the box
 *
 *  <a href="terms.html" rel="facebox">Terms</a>
 *    Loads the terms.html page in the box
 *
 *  <a href="terms.png" rel="facebox">Terms</a>
 *    Loads the terms.png image in the box
 *
 *
 *  You can also use it programmatically:
 *
 *    jQuery.facebox('some html')
 *    jQuery.facebox('some html', 'my-groovy-style')
 *
 *  The above will open a facebox with "some html" as the content.
 *
 *    jQuery.facebox(function($) {
 *      $.get('blah.html', function(data) { $.facebox(data) })
 *    })
 *
 *  The above will show a loading screen before the passed function is called,
 *  allowing for a better ajaxy experience.
 *
 *  The facebox function can also display an ajax page, an image, or the contents of a div:
 *
 *    jQuery.facebox({ ajax: 'remote.html' })
 *    jQuery.facebox({ ajax: 'remote.html' }, 'my-groovy-style')
 *    jQuery.facebox({ image: 'stairs.jpg' })
 *    jQuery.facebox({ image: 'stairs.jpg' }, 'my-groovy-style')
 *    jQuery.facebox({ div: '#box' })
 *    jQuery.facebox({ div: '#box' }, 'my-groovy-style')
 *
 *  Want to close the facebox?  Trigger the 'close.facebox' document event:
 *
 *    jQuery(document).trigger('close.facebox')
 *
 *  Facebox also has a bunch of other hooks:
 *
 *    *beforeLoading.facebox
 *    *loading.facebox (aliased as 'afterLoading.facebox')
 *    *beforeReveal.facebox
 *    *reveal.facebox (aliased as 'afterReveal.facebox')
 *    init.facebox
 *    afterClose.facebox
 *
 *  Simply bind a function to any of these hooks:
 *
 *   $(document).bind('reveal.facebox', function() { ...stuff to do after the facebox and contents are revealed... })
 *
 *  * Indicates a hook that can be bound to the root document, or to an individual element, for example:
 *    $('a.some_clicky_link').bind('beforeLoading', function(){
 *      $.facebox.settings.positionFn = function(){
 *        $(this).facebox('anchor', {vertical: 'bottom', :horizontal: 'right'}, {vertical: 'top', :horizontal: 'right'})
 *      }
 *    })
 *
 *   This will cause the top-right of the facebox to be anchored to the bottom-right of the element when it is displayed,
 *   You may need to reset the positionFn later... the following would work  (false will cause the facebox to be positioned
 *   in the center of the page instead of anchored to another element):
 *
 *  $(document).bind('afterReveal', function(){
 *    $.facebox.settings.positionFn = false
 *  })
 *
 */
(function($) {
  $.facebox = function(data, klass) {
    $.facebox.loading()

    if (data.ajax) fillFaceboxFromAjax(data.ajax, klass)
    else if (data.image) fillFaceboxFromImage(data.image, klass)
    else if (data.div) fillFaceboxFromHref(data.div, klass)
    else if ($.isFunction(data)) data.call($)
    else $.facebox.reveal(data, klass)
  }

  /*
   * Public, $.facebox methods
   */

  $.extend($.facebox, {
    settings: {
      positionFn   : false,
      opacity      : 0.2,
      overlay      : true,
      loadingImage : '/facebox/loading.gif',
      closeImage   : '/facebox/closelabel.png',
      imageTypes   : [ 'png', 'jpg', 'jpeg', 'gif' ],
      faceboxHtml  : '\
    <div id="facebox" class="hidden"> \
      <div class="popup"> \
        <div class="content"> \
        </div> \
        <a href="#" class="close"></a> \
      </div> \
    </div>'
    },

    loading: function(obj) {
      $(document).trigger('beforeLoading.facebox')
      // Maybe we want to bind the event based on the clicked element instead...
      if(obj) $(obj).trigger('beforeLoading.facebox')
      init()
      if ($('#facebox .loading').length == 1) return true
      showOverlay()

      $('#facebox .content').empty().
        append('<div class="loading"><img src="'+$.facebox.settings.loadingImage+'"/></div>')

      // Sometimes we don't want it in the middle of the screen!
      // Users can set anchorFn on a per-element basis within beforeLoading if they so wish
      if($.facebox.settings.positionFn){
        $.facebox.settings.positionFn()
        $('#facebox').removeClass('hidden')
      }else{
        $('#facebox').removeClass('hidden').css({
          top:	getPageScroll()[1] + (getPageHeight() / 10),
          left:	$(window).width() / 2 - ($('#facebox .popup').outerWidth() / 2)
        })
      }

      $(document).bind('keydown.facebox', function(e) {
        if (e.keyCode == 27) $.facebox.close()
        return true
      })
      $(document).trigger('loading.facebox').trigger('afterLoading.facebox')
      if(obj) $(obj).trigger('loading.facebox').trigger('afterLoading.facebox')
    },

    reveal: function(data, klass, obj) {
      $(document).trigger('beforeReveal.facebox')
      if(obj) $(obj).trigger('beforeReveal.facebox')
      if (klass) $('#facebox .content').addClass(klass)
      $('#facebox .content').append(data)
      $('#facebox .loading').remove()
      $('#facebox .popup').children().fadeIn('normal')
      if($.facebox.settings.positionFn){
        $.facebox.settings.positionFn()
      }else{
        $('#facebox').css('left', $(window).width() / 2 - ($('#facebox .popup').outerWidth() / 2))
      }
      $(document).trigger('reveal.facebox').trigger('afterReveal.facebox')
      if(obj) $(obj).trigger('reveal.facebox').trigger('afterReveal.facebox')
    },

    close: function() {
      $(document).trigger('close.facebox')
      return false
    }
  })

  /*
   * Public, $.fn.facebox(method) methods
   */
  var methods = {
    init: function(settings){
      if ($(this).length == 0) return

      init(settings)

      function clickHandler() {
        // We'd like a handle on who got clicked wouldn't we?
        $.facebox.loading(this)

        // support for rel="facebox.inline_popup" syntax, to add a class
        // also supports deprecated "facebox[.inline_popup]" syntax
        var klass = this.rel.match(/facebox\[?\.(\w+)\]?/)
        if (klass) klass = klass[1]

        fillFaceboxFromHref(this.href, klass, this)
        return false
      }
      return this.live('click.facebox', clickHandler)
    },

    // TODO: Add an 'offset' value
    anchor: function(elementAnchorPoint, faceboxAnchorPoint){
      var fb = $("#facebox")
      var eAnchors = {
        vertical: 'bottom',
        horizontal: 'left'
      }

      var fAnchors = {
        vertical: 'top',
        horizontal: 'left'
      }

      if(elementAnchorPoint){
        $.extend(eAnchors, elementAnchorPoint)
      }
      if(faceboxAnchorPoint){
        $.extend(fAnchors, faceboxAnchorPoint)
      }

      if(eAnchors.vertical == 'top'){
        vAnchor = this.offset().top
      }else{
        vAnchor = this.offset().top + this.outerHeight()
      }

      if(eAnchors.horizontal == 'left'){
        hAnchor = this.offset().left
      }else{
        hAnchor = this.offset().left + this.outerWidth()
      }

      if(fAnchors.vertical == 'bottom'){
        vAnchor = vAnchor - fb.outerHeight()
      }

      if(fAnchors.horizontal == 'right'){
        hAnchor = hAnchor - fb.outerWidth()
      }

      fb.css('left', hAnchor)
      fb.css('top', vAnchor)
    }
  }

  // Call init function like normal: $('my-element').facebox({settings})
  // Call other functions too:  $('my-element').facebox('anchor')
  $.fn.facebox = function(method) {
    // Method calling logic
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ))
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments )
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.facebox' )
    }
  }

  /*
   * Private methods
   */

  // called one time to setup facebox on this page
  function init(settings) {
    if ($.facebox.settings.inited) return true
    else $.facebox.settings.inited = true

    $(document).trigger('init.facebox')
    makeCompatible()

    var imageTypes = $.facebox.settings.imageTypes.join('|')
    $.facebox.settings.imageTypesRegexp = new RegExp('\.(' + imageTypes + ')$', 'i')
    if (settings) $.extend($.facebox.settings, settings)
    $('body').append($.facebox.settings.faceboxHtml)

    var preload = [ new Image(), new Image() ]
    preload[0].src = $.facebox.settings.closeImage
    preload[1].src = $.facebox.settings.loadingImage

    $('#facebox').find('.b:first, .bl').each(function() {
      preload.push(new Image())
      preload.slice(-1).src = $(this).css('background-image').replace(/url\((.+)\)/, '$1')
    })

    $('#facebox .close')
      .click($.facebox.close)
      .append('<img src="'
              + $.facebox.settings.closeImage
              + '" class="close_image" title="close">')
  }

  // getPageScroll() by quirksmode.com
  function getPageScroll() {
    var xScroll, yScroll;
    if (self.pageYOffset) {
      yScroll = self.pageYOffset;
      xScroll = self.pageXOffset;
    } else if (document.documentElement && document.documentElement.scrollTop) {	 // Explorer 6 Strict
      yScroll = document.documentElement.scrollTop;
      xScroll = document.documentElement.scrollLeft;
    } else if (document.body) {// all other Explorers
      yScroll = document.body.scrollTop;
      xScroll = document.body.scrollLeft;
    }
    return new Array(xScroll,yScroll)
  }

  // Adapted from getPageSize() by quirksmode.com
  function getPageHeight() {
    var windowHeight
    if (self.innerHeight) {	// all except Explorer
      windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowHeight = document.body.clientHeight;
    }
    return windowHeight
  }

  // Backwards compatibility
  function makeCompatible() {
    var $s = $.facebox.settings

    $s.loadingImage = $s.loading_image || $s.loadingImage
    $s.closeImage = $s.close_image || $s.closeImage
    $s.imageTypes = $s.image_types || $s.imageTypes
    $s.faceboxHtml = $s.facebox_html || $s.faceboxHtml
  }

  // Figures out what you want to display and displays it
  // formats are:
  //     div: #id
  //   image: blah.extension
  //    ajax: anything else
  function fillFaceboxFromHref(href, klass, obj) {
    // div
    if (href.match(/#/)) {
      var url    = window.location.href.split('#')[0]
      var target = href.replace(url,'')
      if (target == '#') return
      $.facebox.reveal($(target).html(), klass, obj)

    // image
    } else if (href.match($.facebox.settings.imageTypesRegexp)) {
      fillFaceboxFromImage(href, klass, obj)
    // ajax
    } else {
      fillFaceboxFromAjax(href, klass, obj)
    }
  }

  function fillFaceboxFromImage(href, klass, obj) {
    var image = new Image()
    image.onload = function() {
      $.facebox.reveal('<div class="image"><img src="' + image.src + '" /></div>', klass, obj)
    }
    image.src = href
  }

  function fillFaceboxFromAjax(href, klass, obj) {
    $.ajax({
      url: href,
      success: function(data){
        $.facebox.reveal(data, klass, obj)
      },
      error: function(xhr, status, error){
        $.facebox.reveal(xhr.responseText, klass, obj)
      }
    })
    //$.get(href, function(data) { $.facebox.reveal(data, klass, obj) })
  }

  function skipOverlay() {
    return $.facebox.settings.overlay == false || $.facebox.settings.opacity === null
  }

  function showOverlay() {
    if (skipOverlay()) return

    if ($('#facebox_overlay').length == 0)
      $("body").append('<div id="facebox_overlay" class="facebox_hide"></div>')

    $('#facebox_overlay').hide().addClass("facebox_overlayBG")
      .css('opacity', $.facebox.settings.opacity)
      .click(function() { $(document).trigger('close.facebox') })
      .fadeIn(200)
    return false
  }

  function hideOverlay() {
    if (skipOverlay()) return

    $('#facebox_overlay').fadeOut(200, function(){
      $("#facebox_overlay").removeClass("facebox_overlayBG")
      $("#facebox_overlay").addClass("facebox_hide")
      $("#facebox_overlay").remove()
    })

    return false
  }

  /*
   * Bindings
   */

  $(document).bind('close.facebox', function() {
    $(document).unbind('keydown.facebox')
    $('#facebox').fadeOut(function() {
      $('#facebox .content').removeClass().addClass('content')
      $('#facebox .loading').remove()
      $('#facebox').addClass('hidden').css('display', '')
      $(document).trigger('afterClose.facebox')
    })
    hideOverlay()
  })

})(jQuery);