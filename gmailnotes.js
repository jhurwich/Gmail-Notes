if (typeof(GmailNotes) == "undefined") {
  var GmailNotes = {};
}

if (typeof(GmailNotes.Inject) == "undefined") {

  GmailNotes.Inject = {

    debug : true,

    port : null,
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

    TRY_DELAY : 400,
    MAX_TRIES : 5,
    run : function(count) {
      var self = GmailNotes.Inject;
      self.log("Inject.run() start");

      // cancel if deferred too many times
      if (count > self.MAX_TRIES) {
        self.log("(!!!!!) Cannot start, Gmail did not finish loading.")
        return;
      }

      // defer run if still loading
      if ($("div#loading").length > 0 && $("div#loading").css("display") != "none") {
        if (typeof(count) == "undefined") {
          count = 0;
        }
        self.log("Inject.run() deferred, #" + (count + 1));
        setTimeout(self.run, self.TRY_DELAY, (count + 1));
        return;
      }

      self.setupObservers();
      self.Notes.run();

      self.log("Inject.run() complete");
    },

    mainObserver : null,
    mailListObserver : null,
    setupObservers : function() {
      var utils = GmailNotes.Util;

      var observeMailTables = function (mailTables) {
        var significantChange = false;

        /* * * * * * * * * * * * * * * Mail List Observer * * * * * * * * * * * * * * */
        // setup a mutation observer to see if the maillists are ever refreshed so we can add marks again
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        if (GmailNotes.Inject.mailListObserver != null) {
          GmailNotes.Inject.mailListObserver.disconnect();
        }
        GmailNotes.Inject.mailListObserver = new MutationObserver(GmailNotes.Inject.Notes.onChange);

        // define what element should be observed by the observer
        // and what types of mutations trigger the callback
        $(mailTables).each(function (index, table) {
          
          // confirm this is actually a mailList, break if not
          if ($(table).find("tr").first().find("td:has(> div[role='img'])").length == 0) {
            return;
          }

          if (typeof($(table).attr("observed")) == "undefined" || !($(table).attr("observed"))) {
            GmailNotes.Inject.mailListObserver.observe(table, {
              subtree: true,
              childList: true,
              attributes: false
            });
            $(table).attr("observed", true);
            significantChange = true;
          }
        });

        if (significantChange) {
          utils.log("Modifying UI after change observed by MainObserver");
          GmailNotes.Inject.Notes.modifyUI();
        }
      }
      observeMailTables($("div:has(> div:has(> table))").find("table"));

      /* * * * * * * * * * * * * * * Main Observer * * * * * * * * * * * * * * */
      // setup a mutation observer to catch when maillists are added/refreshed
      MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
      if (GmailNotes.Inject.mainObserver != null) {
        GmailNotes.Inject.mainObserver.disconnect();
      }
      GmailNotes.Inject.mainObserver = new MutationObserver(function(mutations, observer) {
        for (var i = 0; i < mutations.length; i++) { 
          var tables = $(mutations[i].target).find("table").not("table[observed='true']");
          if (tables.length == 0) {
            // no new tables or maillists
            continue;
          }

          for (var j = 0; j < tables.length; j++) {
            var colgroup = $(tables[j]).find("colgroup").first();
            if ($(colgroup).children("col").length >= GmailNotes.Inject.Notes.cellsInMailRow) {
              observeMailTables($("div:has(> div:has(> table))").find("table"));
            }
          }
        }
      });

      // Use the Gmail link to find the main div
      var gmailA = $("a[title='Gmail'], a[title='Mail']").first();
      var mainDiv = $(gmailA).closest("body > div");
      GmailNotes.Inject.mainObserver.observe(mainDiv.first().get(0), {
        subtree: true,
        childList: true,
        attributes: false
      });

      /* * * * * * * * * * * * * * * Hash Change Detection * * * * * * * * * * * * * * */
      setTimeout(function() {
        var oldHref = location.href;
        setInterval(function() {
          var newHref = location.href;
          if (oldHref !== newHref) {
            oldHref = newHref;
            utils.log("Modifying UI after hash change observed");
            GmailNotes.Inject.Notes.modifyUI();
          }
        }, 500);
      }, 500);
    },

    handleResponse: function(response) {
      if (response.type != "response") {
        return;
      }
      var self = GmailNotes.Inject;
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
      var self = GmailNotes.Inject;

      switch (request.action) {

      case "rerun":
        self.log("Received request for 'rerun', executing.")
        self.run();
        break;

      default:
        console.error("Unrecognized request: " + JSON.stringify(request));
        break;
      }
    },

    Notes : {
      noteMap : {},
      run : function() {
        var utils = GmailNotes.Util;
        utils.log("Notes.run() start");

        var request = utils.newRequest({ action : "getNotes",}, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.notes;
          
          // utils.log("-- " + JSON.stringify(GmailNotes.Inject.Notes.noteMap));

          utils.log("Notes.run() Modifying UI on First Run")
          GmailNotes.Inject.Notes.modifyUI();
        });
        GmailNotes.Inject.port.postMessage(request);

        utils.log("Notes.run() complete");
      },


      onChange : function(mutations, observer) {
        var utils = GmailNotes.Util;
        var significantChange = false;

        // check if this change was triggered by us (first change would be adding note-col, others are adding note-cell)
        var isOwnChange = function(aMutations) {
          return ($(aMutations[0].target).children("td.note-cell").length > 0 || $(aMutations[0].target).children("col.note-col").length > 0)
        };
        if(isOwnChange(mutations)) {
          return;
        }

        for (var i = 0; i < mutations.length; i++) {
          if (typeof($(mutations[i].target).attr("noted")) == "undefined") {
            significantChange = true;
          }
        }
        
        if (significantChange) {
          utils.log("Modifying UI after change observed by MailList Observer");
          GmailNotes.Inject.Notes.modifyUI();
        }
      },

      markInProgress : false,
      cellsInMailRow : 8,
      modifyUI : function() {
        var utils = GmailNotes.Util;
        GmailNotes.Inject.Notes.markInProgress = true;

        var mailViewTable = $('div[role="main"] table[role="presentation"]');
        if (mailViewTable.length > 0) {
          // we're in the reading mail view, mark the header only
          GmailNotes.Inject.Notes.modifyMessageView(mailViewTable);
        } else {
          // We're viewing the full mail list, begin marking rows
          GmailNotes.Inject.Notes.modifyMailList();
        }
        GmailNotes.Inject.Notes.markInProgress = false;
      },

      modifyMessageView : function(mailViewTable) {
        var self = GmailNotes.Inject.Notes;
        var utils = GmailNotes.Util;
        utils.log("Modifying Message View");

        var mailHeader = $(mailViewTable).find("h2").first();
        var subject = mailHeader.text().substring(0, GmailNotes.Util.SUBJECT_CROP_LENGTH); // make sure the length is cropped

        if (typeof(self.noteMap[subject]) == "undefined") {
          // mark non-note
          var noteOffCell = self.newNoteOffCell("div", subject);
          if ($(mailViewTable).find("div.note-cell").length != 0) {
            $(mailViewTable).find("div.note-cell").first().replaceWith(noteOffCell);
          }
          else {
            $(mailHeader).before(noteOffCell);
          }
        } else {
          // mark note
          var noteOnCell = self.newNoteOnCell("div",
                                              subject,
                                              self.noteMap[subject].text,
                                              self.noteMap[subject].color);
          if ($(mailViewTable).find("div.note-cell").length != 0) {
            $(mailViewTable).find("div.note-cell").first().replaceWith(noteOnCell);
          }
          else {
            $(mailHeader).before(noteOnCell);
          }
        }
      },

      modifyMailList : function() {
        var utils = GmailNotes.Util;
        utils.log("Modifying Mail List");

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

        $(noteRows).map(GmailNotes.Inject.Notes.markNoteRow);
        $(nonNoteRows).map(GmailNotes.Inject.Notes.markNonNoteRow);
      },

      markNoteRow : function(index, row) {
        var self = GmailNotes.Inject.Notes;
        var utils = GmailNotes.Util;

        $(row).attr("noted", "true");
        var importantCell = $(row).find("td:has(> div[role='img'])").first();

        var noteOnCell = self.newNoteOnCell("td",
                                            utils.getSubjectForRow(row),
                                            self.noteMap[utils.getSubjectForRow(row)].text,
                                            self.noteMap[utils.getSubjectForRow(row)].color);

        if ($(row).find("td.note-cell").length != 0) {
          $(row).find("td.note-cell").first().replaceWith(noteOnCell);
        }
        else {
          importantCell.after(noteOnCell);
        }
      },

      markNonNoteRow : function(index, row) {
        var self = GmailNotes.Inject.Notes;
        var utils = GmailNotes.Util;

        $(row).attr("noted", "false");
        var importantCell = $(row).find("td:has(> div[role='img'])").first();

        var noteOffCell = self.newNoteOffCell("td", utils.getSubjectForRow(row));

        if ($(row).find("td.note-cell").length != 0) {
          $(row).find("td.note-cell").first().replaceWith(noteOffCell);
        }
        else {
          importantCell.after(noteOffCell);
        }
      },

      newNoteOnCell : function(tag, subject, noteText, noteColor) {
        var noteOnCell = $("<" + tag + " class='note-cell'>\
                              <div class='note-control'>\
                                <div class='note-icon note-on'> </div>\
                                <div class='note'></div>\
                              </div>\
                            </" + tag + ">");
        var noteOnDiv = $(noteOnCell).find(".note-on").first();
        $(noteOnDiv).append($(GmailNotes.Util.noteIconSVG)
                             .css("background-color", noteColor));
        
        $(noteOnCell).mousedown(function(e) {
          e.preventDefault();
          if (e.which == 2) {
            // middle click
            GmailNotes.Inject.Notes.clearNote(subject);
          } else {
            // left click
            GmailNotes.Inject.Notes.setNote(subject);
          }
          return false;
        });

        var note = $(noteOnCell).find(".note").first();
        note.text(noteText);

        return noteOnCell;
      },

      newNoteOffCell : function(tag, subject) {
        var noteOffCell = $("<" + tag + " class='note-cell'>\
                               <div class='note-control'>\
                                 <div class='note-icon note-off'> </div>\
                               </div>\
                             </" + tag + ">");
        var noteOffDiv = $(noteOffCell).find(".note-off").first();
        $(noteOffDiv).append($(GmailNotes.Util.noteIconSVG));
        
        $(noteOffCell).mousedown(function(e) {
          e.preventDefault();
          if (e.which == 2) {
            // middle click
            GmailNotes.Inject.Notes.clearNote(subject);
          } else {
            // left click
            GmailNotes.Inject.Notes.setNote(subject);
          }
          return false;
        });

        return noteOffCell;
      },

      clearNote : function(subject) {
        var utils = GmailNotes.Util;
        var requestOptions = { action: "setNote" };
        requestOptions['subject'] = subject;
        requestOptions['text'] = "";

        var request = utils.newRequest(requestOptions, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.newNoteMap;

          utils.log("Modifying UI after clearing a note");
          GmailNotes.Inject.Notes.modifyUI();
        });
        GmailNotes.Inject.sendMessage(request);
      },

      setNote : function(subject) {
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
          </div>");

        var requestOptions = { action: "getLastColor" };

        var request = GmailNotes.Util.newRequest(requestOptions, function(response) {
          var closeDiv = $(modal).find(".modal-close").first();
          $(closeDiv).css('background-image', "url('" + chrome.extension.getURL("images/modal-close.png") + "')");
          $(closeDiv).bind('click', GmailNotes.Inject.Notes.close);

          var submitButton = $(modal).find(".submit-button").first();
          $(submitButton).bind('click', GmailNotes.Inject.Notes.submit.curry(subject));

          var colorChooser = $(modal).find(".color-chooser").first();
          if (typeof(GmailNotes.Inject.Notes.noteMap[subject]) != "undefined" &&
              GmailNotes.Inject.Notes.noteMap[subject].color.length > 0) {
            $(colorChooser).val(GmailNotes.Inject.Notes.noteMap[subject].color);
          } 
          else if (typeof(response.lastColor) != "undefined" && response.lastColor.length > 0) {
            $(colorChooser).val(response.lastColor);
          }

          // if there's a note for the row, show it in the text area
          var noteArea = $(modal).find(".note-area").first();

          if (typeof(GmailNotes.Inject.Notes.noteMap[subject]) != "undefined") {
            noteArea.val(GmailNotes.Inject.Notes.noteMap[subject].text);
            $(noteArea).select();
          }

          $("body").prepend(blackout);
          $("body").prepend(modal);
        });
        GmailNotes.Inject.sendMessage(request);
      },

      submit : function(subject, event) {
        var utils = GmailNotes.Util;
        var modal = $(".modal").first();
        
        var requestOptions = { action: "setNote" };
        requestOptions['subject'] = subject;
        requestOptions['text'] = $(modal).find(".note-area").first().val();

        var color = $(modal).find(".color-chooser").first().val();
        requestOptions['color'] = color;

        var request = utils.newRequest(requestOptions, function(response) {
          GmailNotes.Inject.Notes.noteMap = response.newNoteMap;

          utils.log("Modifying UI after submitting new note");
          GmailNotes.Inject.Notes.modifyUI();
          GmailNotes.Inject.Notes.close();
        });
        GmailNotes.Inject.sendMessage(request);

        GmailNotes.Inject.Notes.setLastColor(color);
      },

      close : function(event) {
        var color = $("body").find(".modal").first().find(".color-chooser").first().val();
        $("body").find("#blackout").first().remove();
        $("body").find(".modal").first().remove();

        GmailNotes.Inject.Notes.setLastColor(color);
      },

      setLastColor : function(color) {
        var requestOptions = { action: "setLastColor" };
        requestOptions['lastColor'] = color;
        var request = GmailNotes.Util.newRequest(requestOptions, function(response) {

        });
        GmailNotes.Inject.sendMessage(request);
      }
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
  GmailNotes.Inject.init();
  GmailNotes.Inject.run();
};

main(0);