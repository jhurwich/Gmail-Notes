if (typeof(GmailNotes) == "undefined") {
  var GmailNotes = {};
}

if (typeof(GmailNotes.Util) == "undefined") {
  GmailNotes.Util = {

    charsToReturn: 70,
    getSubjectForRow: function(mailRow) {
      // the subject cell has an id but no title
      var subject = $(mailRow).find("span[id]").not("[title]").first().text();

      // we only return the first X characters
      return subject.substring(0, GmailNotes.Util.charsToReturn);
    },

    rowHasNoteTest: function(index, mailRow) {
      if (arguments.length == 1) {
        mailRow = index;
        index = undefined;
      }
      var subject = GmailNotes.Util.getSubjectForRow(mailRow);
      return (typeof(GmailNotes.Inject.Notes.noteMap[subject]) != "undefined");
    },

    pendingCallbacks: {},
    newRequest: function(object, callback) {
      var request = (object ? object : { });
      request.type = "request";


      var rID = new Date().getTime();
      while (rID in GmailNotes.Util.pendingCallbacks) {
        rID = rID + 1;
      }
      request.requestID = rID;

      if (typeof(callback) != "undefined" &&
          callback !== null) {
        GmailNotes.Util.pendingCallbacks[rID] = callback;
      }
      else {
        GmailNotes.Util.pendingCallbacks[rID] = false;
      }

      return request;
    },

    newResponse: function(request, object) {
      var response = (object ? object : { });
      response.type = "response";

      if ("requestID" in request) {
        response.callbackID = request.requestID;
      }
      else {
        console.error("Can't make a response without a callbackID - now requestID in the requesting: " + request.action);
        if ("callbackID" in request) {
          console.error("callbackID: " + request.callbackID);
        }
      }
      return response;
    },

    log : function(str) {
      if (GmailNotes.Inject.debug) {
        var currentTime = new Date();
        console.log("GmailNotes " + currentTime.getTime() + ": " + str);
      }
    },

    noteIconSVG : '<svg xmlns:dc="http://purl.org/dc/elements/1.1/"xmlns:cc="http://creativecommons.org/ns#"xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"xmlns:svg="http://www.w3.org/2000/svg"xmlns="http://www.w3.org/2000/svg"xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"version="1.1"width="743.75"height="1052.5"id="svg2"xml:space="preserve"><metadata id="metadata8"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /></cc:Work></rdf:RDF></metadata><defs id="defs6"><clipPath id="clipPath28"><path d="m 0,0 8963.9998,0 0,1813.9143 L 0,1813.9143 0,0 z"inkscape:connector-curvature="0"id="path30" /></clipPath></defs><g transform="matrix(1.25,0,0,-1.25,0,1052.5)"id="g10"><g transform="matrix(0.06,0,0,-0.06,28.32,813.68)"id="g12"><g id="g14"><g id="g16" /></g><g id="g18"><g id="g20" /><g id="g22" /></g><g id="g24"><g clip-path="url(#clipPath28)"id="g26"><g id="g32"><g transform="scale(9.5974302,9.5974302)"id="g34"><path d="m 8,16 918,0 0,40 L 8,56 8,16 z"inkscape:connector-curvature="0"id="path36"style="fill:#f2f2f2;fill-opacity:1;fill-rule:nonzero;stroke:none" /></g><g transform="scale(9.5974302,9.5974302)"id="g38"><path d="m 8,16 918,0 0,1 -918,0 0,-1 z"inkscape:connector-curvature="0"id="path40"style="fill:#bbbbbb;fill-opacity:1;fill-rule:nonzero;stroke:none" /></g><g transform="scale(9.5974302,9.5974302)"id="g42"><path d="m 8,55 918,0 0,1 -918,0 0,-1 z"inkscape:connector-curvature="0"id="path44"style="fill:#bbbbbb;fill-opacity:1;fill-rule:nonzero;stroke:none" /></g></g><g transform="scale(9.5974302,9.5974302)"id="g46"><g id="g48"><text transform="translate(18,43)"id="text50"><tspan x="0 13 24 36 41 49 60 71 77 82 95 107 113 118 129"y="0"id="tspan52"style="font-size:19px;font-variant:normal;font-weight:bold;writing-mode:lr-tb;fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:Arial-BoldMT">Redirect Notice</tspan></text> </g><g id="g54"><text transform="translate(47,106)"id="text56"><tspan x="0 9 17 26 30 39 44 53 60 64 73 81 89 93 102 111 120 129 133 137 145 149 157 166 174 183 187 195 204 208 215 224 232 236 240 249"y="0"id="tspan58"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">The previous page is sending you to </tspan></text> </g><g id="g60"><text transform="translate(300,106)"id="text62"><tspan x="0 8 12 16 25 29 33 37 48 59 70 74 78 86 95 103 112 117 125 133 137 144 153 157 165 174 187 191 199 207 216 227 231 242 246 254 263 272 283 291 296 305 310 314 322 331 339 347 352 361 368 373 377 385 394 402 410 419 423 436 445 453 461 470 479 483 491 500 505 516 525 529 538 543 547 555 564 572 576 584 588 601"y="0"id="tspan64"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#0000cc;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">http://www.iconarchive.com/show/windows-8-icons-by-icons8/Messaging-Note-icon.html</tspan></text> </g><path d="m 300,107.5 604,0"inkscape:connector-curvature="0"id="path66"style="fill:none;stroke:#0000cc;stroke-width:1;stroke-linecap:square;stroke-linejoin:bevel;stroke-miterlimit:10;stroke-opacity:1;stroke-dasharray:none" /><g id="g68"><text transform="translate(904,106)"id="text70"><tspan x="0"y="0"id="tspan72"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">.</tspan></text> </g><g id="g74"><text transform="translate(47,142)"id="text76"><tspan x="0 3 7 11 18 27 35 39 48 57 61 69 78 82 86 97 106 114 118 122 126 135 139 146 150 158 162 166 170 174 182 191 195 199 208 217 226 235 239 243 250 259 267 271 279 288 296"y="0"id="tspan78"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">If you do not want to visit that page, you can </tspan></text> </g><g id="g80"><text transform="translate(347,142)"id="text82"><tspan x="0 5 14 18 26 31 39 43 47 56 60 64 72 81 85 94 99 108 115 119 128 136 144 148 157 166 175"y="0"id="tspan84"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#0000cc;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">return to the previous page</tspan></text> </g><path d="m 347,143.5 184,0"inkscape:connector-curvature="0"id="path86"style="fill:none;stroke:#0000cc;stroke-width:1;stroke-linecap:square;stroke-linejoin:bevel;stroke-miterlimit:10;stroke-opacity:1;stroke-dasharray:none" /><g id="g88"><text transform="translate(531,142)"id="text90"><tspan x="0"y="0"id="tspan92"style="font-size:16px;font-variant:normal;font-weight:normal;writing-mode:lr-tb;fill:#000000;fill-opacity:1;fill-rule:nonzero;stroke:none;font-family:Arial Black;-inkscape-font-specification:ArialMT">.</tspan></text> </g></g></g></g><g id="g94"><g transform="scale(12,12)"id="g96" /><g id="g98" /></g></g></g></svg>',
  };
}

// copied wholesale from prototype.js, props to them
Function.prototype.curry = function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  if (!arguments.length) return this;
  var __method = this, args = slice.call(arguments, 0);
  return function() {
    var a = merge(args, arguments);
    return __method.apply(this, a);
  };
};