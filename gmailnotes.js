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
      noteMap : {},
      observer : null,
      run : function() {
        var utils = GmailNotes.Util;
        utils.log("Notes.run() start");

        utils.log("-- Requesting notes from backend");
        var request = utils.newRequest({ action : "get_notes",}, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.notes;
          
          utils.log("-- " + Object.keys(GmailNotes.Inject.Notes.noteMap).length + " notes from backend");
          // utils.log("-- " + JSON.stringify(GmailNotes.Inject.Notes.noteMap));

          GmailNotes.Inject.Notes.modifyMailList();
          utils.log("-- adding notes complete.")


          // setup a mutation observer to see if the maillists are ever refreshed so we can add marks again
          MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
          if (GmailNotes.Inject.Notes.observer != null) {
            GmailNotes.Inject.Notes.observer.disconnect();
          }
          GmailNotes.Inject.Notes.observer = new MutationObserver(GmailNotes.Inject.Notes.onChange);

          // define what element should be observed by the observer
          // and what types of mutations trigger the callback
          var mailLists = $("div:has(> div:has(> table))");
          $(mailLists).each(function (index, elem) {
            
            // confirm this is actually a mailList, break if not
            if ($(elem).find("tr").first().find("td:has(> div[role='img'])").length == 0) {
              return;
            }

            GmailNotes.Inject.Notes.observer.observe(elem, {
              subtree: true,
              childList: true,
              attributes: false
            });
          });
        });
        GmailNotes.Inject.port.postMessage(request);

        utils.log("Notes.run() complete");
      },


      onChange : function(mutations, observer) {
        var significantChange = false;
        for (var i = 0; i < mutations.length; i++) { 
          if (typeof($(mutations[i].target).attr("noted")) == "undefined") {
            significantChange = true;
          }
        }
        if (significantChange) {
          GmailNotes.Inject.Notes.modifyMailList();
        }
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

      markInProgress : false,
      cellsInMailRow : 8,
      modifyMailList : function() {
        GmailNotes.Inject.Notes.markInProgress = true;
        var allRows = $("tbody > tr");

        var isMailRowTest = function(index, row) {
          return ($(row).attr("noted") ||
                  $(row).children("td").length == GmailNotes.Inject.Notes.cellsInMailRow);
        };
        var mailRows = $(allRows).filter(isMailRowTest);

        // make room in each mail table for the note cell
        var colgroups = $("colgroup");

        var isMailColGroup = function(index, colgroup) {
          return ($(colgroup).children("col").length == GmailNotes.Inject.Notes.cellsInMailRow);
        };
        var mailColGroups = $(colgroups).filter(isMailColGroup);

        mailColGroups.each(function(index, colgroup) {
          var colBefore = $(colgroup).children("col").slice(2,3);
          $(colBefore).after("<col class='note-col'></col>");
        });

        // mark the rows with and without notes
        var noteRows = $(mailRows).filter(GmailNotes.Util.rowHasNoteTest);
        var nonNoteRows = $(mailRows).not(noteRows);

        $(noteRows).map(GmailNotes.Inject.Notes.markNote);
        $(nonNoteRows).map(GmailNotes.Inject.Notes.markNonNote);
        GmailNotes.Inject.Notes.markInProgress = false;
      },

      markNote : function(index, row) {
        $(row).attr("noted", "true");
        var importantCell = $(row).find("td:has(> div[role='img'])").first();

        var noteOnCell = $("<td class='note-cell'>\
                              <div class='note-control'>\
                                <div class='note-icon note-on'> </div>\
                                <div class='note'>Some cool note will be written here.</div>\
                              </div>\
                            </td>");
        var noteOnDiv = $(noteOnCell).find(".note-on").first();
        $(noteOnDiv).append($(GmailNotes.Util.noteIconSVG));
        
        $(noteOnCell).click(GmailNotes.Inject.Notes.setNote.curry(row));

        var note = $(noteOnCell).find(".note").first();
        note.text(GmailNotes.Inject.Notes.noteMap[GmailNotes.Util.getSubjectForRow(row)].text);

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

        var noteOffCell = $("<td class='note-cell'>\
                               <div class='note-control'>\
                                 <div class='note-icon note-off'> </div>\
                               </div>\
                             </td>");
        var noteOffDiv = $(noteOffCell).find(".note-off").first();
        $(noteOffDiv).css('background-image', "url('" + chrome.extension.getURL("images/note-off.png") + "')");
        
        $(noteOffCell).click(GmailNotes.Inject.Notes.setNote.curry(row));

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
            <div class='modal-close'></div>\
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

        var closeDiv = $(modal).find(".modal-close").first();
        $(closeDiv).css('background-image', "url('" + chrome.extension.getURL("images/modal-close.png") + "')");
        $(closeDiv).bind('click', GmailNotes.Inject.Notes.close);

        var submitButton = $(modal).find(".submit-button").first();
        var subject = GmailNotes.Util.getSubjectForRow(row);
        $(submitButton).bind('click', GmailNotes.Inject.Notes.submit.curry(subject));

        // if there's a note for the row, show it in the text area
        var noteArea = $(modal).find(".note-area").first();
        if (GmailNotes.Util.rowHasNoteTest(row)) {
          noteArea.val(GmailNotes.Inject.Notes.noteMap[subject].text);
          $(noteArea).select();
        }

        $("body").prepend(blackout);
        $("body").prepend(modal);

        // prevent event propagation  
        return false;
      },

      submit : function(subject, event) {
        var modal = $(".modal").first();
        
        var requestOptions = { action: "setNote" };
        requestOptions['subject'] = subject;
        requestOptions['text'] = $(modal).find(".note-area").first().val();
        requestOptions['color'] = $(modal).find(".color-chooser").first().val();

        var request = GmailNotes.Util.newRequest(requestOptions, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.newNoteMap;
          GmailNotes.Inject.Notes.modifyMailList();
          GmailNotes.Inject.Notes.close();
        });
        GmailNotes.Inject.sendMessage(request);
      },

      close : function(event) {
        $("body").find("#blackout").first().remove();
        $("body").find(".modal").first().remove();
      },
    },

    sendMessage: function(message) {
      var self = GmailNotes.Inject;
      if (message.type == "request") {
        self.log("Posting request: " + message.action);
      }
      else if (message.type == "response") {
        self.log("Posting response - callback: " + message.callbackID);
      }

      self.port.postMessage(message);
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