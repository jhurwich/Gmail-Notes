if (typeof(GmailNotes) == "undefined") {
  var GmailNotes = {};
}

if (typeof(GmailNotes.Inject) == "undefined") {

  GmailNotes.Inject = {

    debug : true,

    port : null,
    currVoice: "off",
    init : function() {
      var self = this;
      self.log("Beginning initialization");

      self.port = chrome.extension.connect();
      self.port.onMessage.addListener(self.handleRequest);
      self.port.onMessage.addListener(self.handleResponse);

      /*
      // forced hash change event
      setTimeout(function() {
        var oldHref = location.href;
        setInterval(function() {
          var newHref = location.href;
          if (oldHref !== newHref) {
            oldHref = newHref;
            GmailNotes.Inject.Notes.run();
          }
        }, 500);
      }, 500);
      */

      self.log("Initialization complete");
    },

    run : function() {
      var self = this;
      self.log("run() start");

      self.Notes.run();

      self.log("run() complete");
    },

    handleResponse: function(response) {
      if (response.type != "response") {
        return;
      }
      var utils = GmailNotes.Util;

      if (response.callbackID in utils.pendingCallbacks &&
          utils.pendingCallbacks[response.callbackID]) {
        utils.pendingCallbacks[response.callbackID](response);

        delete utils.pendingCallbacks[response.callbackID];
      }
      else if(typeof(utils.pendingCallbacks[response.callbackID]) !== "undefined") {
        console.error("Could not find callback '" + response.callbackID + "' for response: " + JSON.stringify(response));
      }
    },

    handleRequest : function(request) {
      if (request.type != "request") {
        return;
      }
      switch (request.action) {
      case "set_voice":
        GmailNotes.Inject.currVoice = request.voice;
        break;

      case "rerun":
        GmailNotes.Inject.run();
        break;

      default:
        console.error("Unrecognized request: " + JSON.stringify(request));
        break;
      }
    },

    Notes : {
      run : function() {
        var utils = GmailNotes.Util;
        utils.log("Notes.run() start");

        utils.log("-- Requesting notes from backend");
        var request = utils.newRequest({ action : "get_notes",}, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.notes;
          
          utils.log("-- " + Object.keys(GmailNotes.Inject.Notes.noteMap).length + " notes from backend");
          // utils.log("-- " + JSON.stringify(GmailNotes.Inject.Notes.noteMap));

          GmailNotes.Inject.modifyMailList(GmailNotes.Inject.Notes.noteMap);
          utils.log("-- adding notes complete.")
        });
        GmailNotes.Inject.port.postMessage(request);

        utils.log("Notes.run() complete");
      },
    },

    /*
    modifyPlayer : function() {
      var playerAutoskip = $("<div class='playerAutoskip'></div>");
      $(playerAutoskip).css('background-image', "url('" + chrome.extension.getURL("images/player-autoskip.png") + "')");
      $(playerAutoskip).hover(function() {
        $(this).css('background-image', "url('" + chrome.extension.getURL("images/player-autoskip-hover.png") + "')");
      }, function() {
        $(this).css('background-image', "url('" + chrome.extension.getURL("images/player-autoskip.png") + "')");
      });
      $(playerAutoskip).click(GmailNotes.Inject.autoskipFromPlayer);

      if ($("div.playerAutoskip").length !== 0) {
        $("div.playerAutoskip").remove();
      }
      $(playerAutoskip).insertBefore($("#player-controls").find("#playerFav").first());
    },
    

    autoskipFromPlayer : function() {
      var id = GmailNotes.Util.getCurrentTrackID();
      GmailNotes.Inject.toggleAutoskip($("div[data-itemid='" + id + "']").first());
      GmailNotes.Util.nextTrack();
    },
    */

    cellsInMailRow : 8,
    modifyMailList : function(noteMap) {
      var allRows = $("tbody > tr");

      var isMailRowTest = function(index, row) {
        return ($(row).children("td").length == GmailNotes.Inject.cellsInMailRow);
      };
      var mailRows = $(allRows).filter(isMailRowTest);

      // make room in each mail table for the note cell
      var colgroups = $("colgroup");

      var isMailColGroup = function(index, colgroup) {
        return ($(colgroup).children("col").length == GmailNotes.Inject.cellsInMailRow);
      };
      var mailColGroups = $(colgroups).filter(isMailColGroup);

      mailColGroups.each(function(index, colgroup) {
        var colBefore = $(colgroup).children("col").slice(2,3);
        $(colBefore).after("<col class='note-col'></col>");
      });

      // mark the rows with and without notes
      var hasNoteTest = function(index, mailRow) {
        var subject = GmailNotes.Util.getSubjectForRow(mailRow);
        console.log(index + ": " + subject);
        return (typeof(noteMap[subject]) != "undefined");
      };
      var noteRows = $(mailRows).filter(hasNoteTest);
      var nonNoteRows = $(mailRows).not(noteRows);

      $(noteRows).map(GmailNotes.Inject.markNote);
      $(nonNoteRows).map(GmailNotes.Inject.markNonNote);
    },

    markNote : function(index, row) {
      $(row).attr("noted", "true");
      var importantCell = $(row).find("td:has(> div[role='img'])").first();

      var noteOnCell = $("<td class='note-cell'><div class='note-control note-on'> </div></li>");
      var noteOnDiv = $(noteOnCell).find(".note-on").first();
      $(noteOnDiv).css('background-image', "url('" + chrome.extension.getURL("images/note-on.png") + "')");
      
      $(noteOnCell).click(GmailNotes.Inject.setNote.curry(row));

      if ($(row).find("td.note-cell").length != 0) {
        $(row).find("td.note-cell").first().replaceWith(noteOnCell);
      }
      else {
        importantCell.after(noteOnCell);
      }
    },

    markNonNote : function(index, row) {
      $(row).attr("noted", "false");
      var importantCell = $(row).find("td:has(> div[role='img'])").first();

      var noteOffCell = $("<td class='note-cell'><div class='note-control note-off'> </div></li>");
      var noteOffDiv = $(noteOffCell).find(".note-off").first();
      $(noteOffDiv).css('background-image', "url('" + chrome.extension.getURL("images/note-off.png") + "')");
      
      $(noteOffCell).click(GmailNotes.Inject.setNote.curry(row));

      if ($(row).find("td.note-cell").length != 0) {
        $(row).find("td.note-cell").first().replaceWith(noteOffCell);
      }
      else {
        importantCell.after(noteOffCell);
      }
    },

    setNote : function(row, e) {
      e.preventDefault();

      var blackout = $("<div id='blackout'></div>");
      var modal = $("\
        <div class='modal'>\
          <div class='note-container'>\
            <div class='note-box'>\
              <textarea class='note-area' rows=5 autofocus></textarea>\
            </div>\
            \
            <div class='button-box'>\
              <input class='color-chooser' type='color' value='#04ff00'>\
              <input class='submit-button' type='button' value='Submit'>\
            </div>\
          </div>\
        </div>")

      $("body").prepend(blackout);
      $("body").prepend(modal);
      /*
      var id = $(row).attr("data-itemid");
      var autoskip = ($(row).attr('autoskip') == "true");

      var setter = { action : "set_autoskip"};
      if (autoskip) {
        setter.off = id;
      }
      else {
        setter.on = id;
      }
      var request = GmailNotes.Util.newRequest(setter, function(response) {
        if(autoskip) {
          // toggling to off
          GmailNotes.Inject.markNonskip(0, row);
        }
        else {
          // toggling to on
          GmailNotes.Inject.markAutoskip(0, row);
        }

        GmailNotes.Inject.Autoskip.autoskipTracks[id] = !autoskip;

        // check if the current track was auto-skipped
        if (id == GmailNotes.Util.getCurrentTrackID()) {
          GmailNotes.Util.nextTrack();
        }
      });
      GmailNotes.Inject.port.postMessage(request);
      */
      return false;
    },

    // uplevel the util logging method
    log : GmailNotes.Util.log,
  };
}

// Extension main script
var main = function(count) {
  if (document.getElementById("menu-username") == null &&
      count <= 5) {
    // can't tell if logged in yet, defer
    setTimeout(main, 400, (count + 1));
    return;
  }

  GmailNotes.Inject.init();
  GmailNotes.Inject.run();
};

main(0);