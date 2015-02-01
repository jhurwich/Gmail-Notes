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

    noteIconSVG : '<svg class="note-svg" viewBox="0 0 14 14" version="1.1"xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"x="0px" y="0px" width="14px" height="14px"> <rect class="icon-component" x="0" y="0" width="14" height="14" stroke="#000000" stroke-width="1" fill="none" rx="1.4" ry="1.4"/> <path class="icon-component" id="Line" d="M 3.5 4.5 L 11.5 4.5 " stroke="#000000" stroke-width="1" fill="none"/> <path class="icon-component" id="Line2" d="M 3.5 7.5 L 11.5 7.5 " stroke="#000000" stroke-width="1" fill="none"/> <path class="icon-component" id="Line3" d="M 3.5 10.5 L 9.5 10.5 " stroke="#000000" stroke-width="1" fill="none"/> </svg>'
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