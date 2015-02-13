if (typeof(GmailNotes) == "undefined") {
  var GmailNotes = {};
}

if (typeof(GmailNotes.Bkgrd) == "undefined") {

  GmailNotes.Bkgrd = {

    debug : false,

    run : function() {
      var self = this;
      self.log("run() start");

      chrome.extension.onRequest.addListener(this.requestListener);
      chrome.extension.onConnect.addListener(this.portListener);

      self.log("run() complete");
    },

    // requests are used for messages from the Browser Action
    requestListener: function(request, sender, sendResponse) {
      switch (request.action) {

      case "getVoices":
        chrome.storage.sync.get("currVoice", function(object) {
          chrome.tts.getVoices(function(voices) {
            var response = {};
            response.voices = voices;
            if (typeof(object.currVoice) == "undefined") {
              object.currVoice = "off"; // default to off
            }
            response.currVoice = object.currVoice;
            sendResponse(response);
          });
        });
        break;

      case "setSpeech":
        var voice = request.voice;
        chrome.storage.sync.set({ "currVoice" : voice }, function() {
          sendResponse({});

          var request = GmailNotes.Util.newRequest({ action: "set_voice",
                                                    voice: voice });
          GmailNotes.Util.postMessage("all", request);
        });
        break;

      case "rerun":
        var request = GmailNotes.Util.newRequest({ action: "rerun" });
        GmailNotes.Util.postMessage("all", request);
        break;

      default:
        console.error("Unrecognized request: " + JSON.stringify(request));
        break;
      }
    },

    // ports are used for communication with content scripts in tabs
    portListener : function(port) {
      var util = GmailNotes.Util;

      // we seem to get multiple connection requests for the same tab
      if (typeof(util.ports[port.sender.tab.id]) != "undefined" &&
          util.ports[port.sender.tab.id]) {
        return;
      }
      util.ports[port.sender.tab.id] = port;

      port.onDisconnect.addListener(GmailNotes.Bkgrd.disconnectPortListener);
      port.onMessage.addListener(GmailNotes.Bkgrd.handleMessage.curry(port));
    },

    disconnectPortListener : function(port) {
      var util = GmailNotes.Util;

      // delete the port in the registry
      delete util.ports[port.sender.tab.id];
    },

    handleMessage: function(port, request) {
      if (request.type != "request") {
        return;
      }

      var response = GmailNotes.Util.newResponse(request);

      switch (request.action) {
      case "getNotes":
        chrome.storage.sync.get("notes", function(stored) {
          response.notes = stored.notes;
          if (typeof(response.notes) == "undefined") {
            response.notes = {};
          }

          GmailNotes.Util.postMessage(port.sender.tab.id, response);
        });
        break;

      case "setNote":
        chrome.storage.sync.get("notes", function(stored) {
          if (typeof(stored.notes) == "undefined") {
            stored.notes = {};
          }
          stored.notes[request.subject] = { text: request.text, color: request.color };

          if (typeof(stored.notes[request.subject]) != "undefined" && request.text == "") {
            // clearing note, no text provided
            delete stored.notes[request.subject];            
          }

          chrome.storage.sync.set({ "notes" : stored.notes }, function() {
            response.newNoteMap = stored.notes;
            GmailNotes.Util.postMessage(port.sender.tab.id, response);
          });
        });
        break;

      case "getLastColor":
        chrome.storage.sync.get("lastColor", function(stored) {
          response.lastColor = stored.lastColor;
          if (typeof(response.lastColor) == "undefined") {
            response.lastColor = "";
          }

          GmailNotes.Util.postMessage(port.sender.tab.id, response);
        });
        break;

      case "setLastColor":
        chrome.storage.sync.set({ "lastColor" : request.lastColor }, function() {
          GmailNotes.Util.postMessage(port.sender.tab.id, response);
        });
        break;

      default:
        console.error("Unexpected request action '" + request.action + "'");
        break;
      } // end switch
      return;
    },

    // uplevel the util logging method
    log : GmailNotes.Util.log,
  };

}

GmailNotes.Bkgrd.run();