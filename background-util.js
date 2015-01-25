if (typeof(GmailNotes) == "undefined") {
  var GmailNotes = {};
}

if (typeof(GmailNotes.Util) == "undefined") {

  GmailNotes.Util = {

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

    ports: {},
    postMessage: function(tabID, message) {
      var self = GmailNotes.Util;
      var ports = self.ports;
      var currentTime = new Date();
      if (typeof(tabID) == "undefined") {
        console.error("Posting message to undefined tabID.");
      }

      if (tabID == "all") {
        for (var aTabID in ports) {
          ports[aTabID].postMessage(message);
        }
      }
      else if (typeof(tabID) != "undefined" &&
          typeof(ports[tabID]) != "undefined" &&
          ports[tabID] !== null) {
        ports[tabID].postMessage(message);
      }
    },

    log : function(str) {
      if (GmailNotes.Bkgrd.debug) {
        var currentTime = new Date();
        console.log("GmailNotes " + currentTime.getTime() + ": " + str);
      }
    }
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