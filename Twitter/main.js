define(['HubLink', 'RIB', 'PropertiesPanel', 'Easy', 'User'], function(Hub, RIB, Ppanel, easy, User) {

  // Tweet: Sends whatever data arrives.
  // GetFollowers: Produces an event to the 'FollowerCount' input with the current
  // number of followers.
  // Preview (added dynamically): Simulates a Tweet event but shows a popup with the tweet instead
  // of sending it.
  var actions = ["Tweet"];
  // TODO: Implement follower count change, and mentions event
  var inputs = ["SendOK", "SendError", "NewFollower"];
  var _objects = {};

  var Twitter = {};


  // Set if the blocks is Input and/or Output
  Twitter.isInputBlock = true;
  Twitter.isOutputBlock = true;

  /**
   * @returns a list of the variables used in the 
   * given template index.
   */
  Twitter.getTemplateVariables = function(index){
    var list = [];
    if(index < this.config.templates.length){
      var reg = /_(.*?)_/g;
      var template = this.config.templates[index];
      var match = reg.exec(template.text);
      var group = '';
      while(match !== null){
        group = match[1];
        // Make sure the variable isn't already added.
        if(list.indexOf(group) === -1){
          // Pushing the group name
          list.push(group);
        }
  
        match = reg.exec(template.text);
      }
    }
    
    return list;
  }

  /**
   * @returns the list of actions
   * and template variables
   */
  Twitter.getActions = function() {
    var list = actions.slice();
    var that = this;
    // Extract the list of variables
    this.config.templates.forEach(function(t, index){
      list.push("Preview: "+t.title);
      list.push("Tweet: "+t.title);
      var vars = Twitter.getTemplateVariables.call(that, index);
      vars.forEach(function(v){
        if(list.indexOf(v) === -1){
          // Pushing the group name
          list.push("Set: " + v);
        }
      });
    });

    return list;
  };


  Twitter.getInputs = function() {
    return inputs;
  };


  /**
   * (OPTIONAL)
   * Called when no logic has been added in the Logic Maker.
   * Here you can define a default action for your block to 
   * execute when a signal is sent.
   * IMPORTANT: Input Blocks SHOULD NOT use this method
   */
  Twitter.getDefaultAction = function() {
    return "Tweet";
  };

  /**
   * This method is called when the user hits the "Save"
   * recipe button. Any object you return will be stored
   * in the recipe and can be retrieved during startup (@onLoad) time.
   * Be aware that only primitive properties are stored
   * (Numbers, Strings)
   */
  Twitter.onBeforeSave = function() {
    return this.config;
  };

  /**
   * Use this method to control the visibility of the DataFeed panel
   * By default the DataFeed is shown when the user clicks on the
   * canvas Icon. Return true to prevent the panel from showing.
   */
  Twitter.hideDataFeed = function() {
    return true;
  };


  /**
   * When a canvas block is clicked on, this method is executed
   * to check if the properties panel needs to open automatically.
   * This is useful in those cases when users MUST define some
   * properties in order to make the block work.
   */
  Twitter.hasMissingProperties = function() {
    return this.config.templates.length === 0;
  };

  /**
   * Intercepts the properties panel closing action.
   * Return "false" to abort the action.
   * NOTE: Settings Load/Saving will automatically
   * stop re-trying if the event propagates.
   */
  Twitter.onCancelProperties = function() {
    console.log("Cancelling Properties");
  };


  /**
   * Triggered when added for the first time to the side bar.
   * This script should subscribe to all the events and broadcast
   * to all its copies the data.
   * NOTE: The call is bound to the block's instance, hence 'this'
   * does not refer to this module, for that use "this.controller"
   */
  Twitter.onLoad = function() {
    var that = this;
    var requiredVersion = '1.2.4';
    this.config = {
      templates: [],
      values: {}
    };

    // First we make sure we are working with the correct version of the hub
    Hub.isMinVersion(requiredVersion, function onYes(){
      // Load previously stored settings
      if (this.storedSettings && this.storedSettings.templates) {
        this.config.templates = this.storedSettings.templates || [];
      }

      // Load our properties template and keep it in memory
      this.loadTemplate('properties.html').then(function(template) {
        that.propTemplate = template;
        // Since the link was already loaded it gets loaded from the cache
        // then we select the correct template
        return that.loadTemplate('properties.html', 'twitter-preview').then(function(template) {
          that.previewBox = template;
          Twitter.renderInterface.call(that);
        });
      });

      this.loadStyleSheet(this.basePath + "css/twitter-block-style.css").then(function(){
        console.log("Twitter stylesheet loaded!")
      }).catch(function(e){
        console.log("Error loading stylesheet: ", e);
      });

      Twitter.userAuthCheck.call(this);
    }, function(){
      notification.notify('error', 'This block requires the Hub to be '+requiredVersion+' or greater!');
      that.deactivate();
    }, this);
  };

  /**
   * Registers the subscriptions for the streaming
   * events (followers count, etc)
   */
  Twitter.createStreamSubscriptions = function(){
    var that = this;

    if(!that.twitterUserInfo){
      return console.log("Aborting stream subscriptions, no yet authorized");
    }
    
    var opts = {
      argvs: {
        type: 'followersCountStream'
      }
    };

    return Hub.subscribe("service:twitter", opts).then(function(eventId) {
      console.log("Event: ", eventId);
      that._subsHookId = eventId;
      // Listen for this type of events
      Hub.on(eventId, function(data) {
        if(data.follower && data.followers_count){
          console.log("Twitter stream event: ", data);
          var event = {newfollower: data.followers_count};
          // Send to widgets
          that.dispatchDataFeed(event);
          // Send to LM
          that.processData(event);
        }else if(data.connection_dropped){
          console.log("Subscription dropped by the Server!");
          // If a connection is dropped, we re-issue 
          Twitter.unsubscribeFromStreams.call(that, Twitter.createStreamSubscriptions.bind(that));
        }else{
          console.log("Invalid event object: ", data);
        }
      });
    }).catch(function(err){
      console.log("Error starting subscription: ", err);
    });
  };

  Twitter.onBeforeDestroy = function(){
    Twitter.unsubscribeFromStreams.call(this)
  }

  /**
   * Called when the block is removed from
   * the canvas. Here we remove subscriptions.
   * @param {*Function} cb is a method to call
   * when the process is finished.
   */
  Twitter.unsubscribeFromStreams = function(cb){
    if(this._subsHookId){
      var that = this;
      return Hub.unsubscribe(this._subsHookId).then(function(){
        console.log("Unsubscribed from Twitter Service");
      }).catch(function(err){
        console.log("Error unsubscribing from Twitter: ", err);
        if(typeof cb === 'function') cb(err);
      }).then(function(){
        console.log("Removing local subscription listener...");
        if(!Hub.off(that._subsHookId)){
          console.log("Error removing subscription '%s' before Twitter destruction", that._subsHookId);
        }else{
          console.log("Local subscription removed!");
        }
        if(typeof cb === 'function') cb();
      });
    }
  }


  /**
  * Checks if the user has authorize the application
  */
  Twitter.userAuthCheck = function(cb){
    var that = this;
    that.authorizing = true;
    Twitter.renderInterface.call(this);
    console.log("Checking authorization...");
    return Twitter.sendRequest.call(this, 'isAuthorized').then(function(res){
      console.log("Authorization results: ", res);
      that.authorizing = false;
      if(res.success && res.data.success){
        that.twitterUserInfo = res.data;
      }

      Twitter.renderInterface.call(that);
      Twitter.createStreamSubscriptions.call(that);
    }).catch(function(err){
      that.authorizing = false;
      console.log("Error authorizing user: ", err);
      Twitter.renderInterface.call(that);
      notification.notify('warning', 'Error getting the authorization. This block may not work.');
    });
  };

  /**
   * Parent is asking me to execute my logic.
   * This block only initiate processing with
   * actions from the hardware.
   */
  Twitter.onExecute = function(event) {
    if(event.action === 'Tweet'){
      // Sends whatever data arrive.
      Twitter.tweet.call(this, event.data);
    // }else if(event.action === 'GetFollowersCount'){
    //   Twitter.getFollowers.call(this);
    }else if(eventIs(event, "Set: ")){
      var varName = getTitle(event, "Set: ");
      this.config.values[varName] = event.data;
      console.log("Values: ", this.config.values);
    }else if(eventIs(event, "Preview: ")){
      var title = getTitle(event, "Preview: ");
      var index = Twitter.getTemplateIndexByTitle.call(this, title);
      if(index !== undefined){
        Twitter.showPreview.call(this, index);
      }
    }else if(eventIs(event, "Tweet: ")){
      var title = getTitle(event, "Tweet: ");
      var index = Twitter.getTemplateIndexByTitle.call(this, title);
      if(index !== undefined){
        Twitter.tweetTemplate.call(this, index);
      }
    }
  };

  Twitter.getFollowers = function(){
    var that = this;
    return Twitter.sendRequest.call(this, 'getFollowersCount').then(function(r){
      console.log("Total Followers ", r);
      if(r.success){
        var evt = {followerscount: r.data};
        that.processData(evt);
      }
    }).catch(function(e){
      notification.notify( 'error', 'Error getting the followers count' );
      console.log("Error getting followers count: ", e);
    });
  }

  function eventIs(evt, expected){
    return (evt.action.indexOf(expected) != -1);
  };

  function getTitle(evt, delimiter){
    var sp = evt.action.split(delimiter);
    return sp[1];
  };

  Twitter.getTemplateIndexByTitle = function(title){
    for(var i = 0; i < this.config.templates.length; i++){
      if(this.config.templates[i].title === title){
        return i;
      }
    }
  };

  Twitter.tweetTemplate = function(index){
    var parsedTemplate = Twitter.parseTemplate.call(this, index);
    if(parsedTemplate){
      Twitter.tweet.call(this, parsedTemplate);
    }
  }

  /**
   * Tweets out the raw text.
   * It shows a notification if there was an error
   * sending the tweet.
   * @returns nothing.
   */
  Twitter.tweet = function(text){
    var that = this;
    return Twitter.sendRequest.call(this, 'sendTweet', {message: text}).then(function(r){
      console.log("Send Tweet response: ", r);
      if(r.success && r.data.success){
        notification.notify( 'success', 'Tweet sent!' );
        // Send LM event
        var evt = {sendok: true};
        that.processData(evt);
      }else{
        notification.notify( 'error', 'Error sending tweet: ' + r.reason || r.data.reason || 'Unknown');
      }
    }).catch(function(e){
      console.log("Error sending tweet: ", e);
      var msg = "Error sending tweet";
      if(e.data && typeof e.data === 'string'){
        msg = e.data;
      }
      notification.notify( 'error', msg);
      var evt = {senderror: true};
      that.processData(evt);
    });
  }

  /**
   * Makes an API request.
   */
  Twitter.sendRequest = function (type, options){
    return new Promise(function (resolve, reject) {
      var parameters = {
        argvs: {
          type: type
        }
      }
      if(options){
        Object.assign(parameters.argvs, options);
      }
      
      Hub.request('service:twitter', parameters).then(resolve).catch(reject); 
    });
  }

  /**
   * Triggered when the user clicks on a block.
   * The properties panel is opened automatically.
   * Here we must load the elements.
   * NOTE: This is called with the scope set to the
   * Block object, to refer to this module's properties
   * use Twitter or this.controller
   */
  Twitter.onClick = function() {
    // Nothing to do here
    Twitter.renderInterface.call(this);
  };

  /**
   * Called when the user needs to start the authorization
   * process.
   */
  Twitter.initAuth = function(){
    var that = this;
    return Twitter.sendRequest.call(this, 'getAuthUrl').then(function(res){
      if(res.success && res.data.success){
          
        var w = window.open(res.data.url, 'Authorize', 'location=0,status=0,width=800,height=600');
        if(!w){
          return notification.notify( 'warning', 'You seem to have a popup blocker, please disable it and try again.');
        }

        var winClosed = function(a, b, c){
          Twitter.userAuthCheck.call(that);
        }; 

        var isClosed = function(){
          if (w.closed !== false) {
            winClosed.call(this);
          }else{
            setTimeout(isClosed.bind(that), 200);    
          }
        }

        setTimeout(isClosed.bind(that), 200);
      }else{
        console.log("Invalid response: ", res);
        notification.notify( 'error', 'Error initiating redirection');
        Twitter.renderInterface.call(that);
      }
    }).catch(function(err){
      console.log("Error getting auth url: ", err);
      notification.notify( 'error', 'Error initiating authorization' );
      Twitter.renderInterface.call(that);
    });
  };

  /**
   * Helper method to populate the properties panel.
   */
  Twitter.renderInterface = function(){
    var that = this;
    if(!this.propTemplate) return;
    if(!Ppanel.isVisible()) return;
    
    
    easy.clearAll();
    // Compile template using current list
    this.myPropertiesWindow = $(this.propTemplate(this));

    // Interface event handlers
    this.myPropertiesWindow.find("#btAdd").click(Twitter.addNewTemplate.bind(this));
    this.myPropertiesWindow.find("#btEdit").click(Twitter.editTemplate.bind(this));
    this.myPropertiesWindow.find("#btDelete").click(Twitter.deleteTemplate.bind(this));
    this.myPropertiesWindow.find(".tweet-title").focusout(function(el){
      var index = getIndexFromElement(el);
      Twitter.updateItem.call(that, index);
    });

    this.myPropertiesWindow.find("#btAuthorize").click(function(el){
      $(this).addClass("disabled loading");
      Twitter.initAuth.call(that);
    });

    // Display elements
    easy.displayCustomSettings(this.myPropertiesWindow, true, true);
  };

  function getRandomNum(min, max){
    var n = Math.floor(Math.random()*(max-min+1)+min);
    return n.toLocaleString();
  }

  Twitter.showPreview = function(index){
    if(this.previewBox){
      var parsedTemplate = Twitter.parseTemplate.call(this, index);
      if(parsedTemplate){
        var d = moment().format('h:mm A - MMM Do YYYY');
        var params = {
          basePath: this.basePath,
          twitterUserInfo: this.twitterUserInfo,
          contentInit: parsedTemplate.substr(0, 200),
          contentLast: parsedTemplate.substr(201),
          date: d,
          replies: getRandomNum(2, 200),
          retweets: getRandomNum(200, 2000),
          likes: getRandomNum(200, 30000),
        }
        this.previewWindow = $(this.previewBox(params));
        var modalBox = this.previewWindow.closest("#msg-tweet-preview");
        // Find any previews window
        var previousW = $("#msg-tweet-preview");
        if(previousW.length){
          modalBox.css("left", previousW.position().left + "px");
          modalBox.css("top", previousW.position().top + "px");
          previousW.remove();
        }

        modalBox.find("#tweet-close-btn").click(function(){
          modalBox.remove(); 
        });

        modalBox.appendTo("body");
        modalBox.draggable({handle: ".header"});
      }
    }
  };

  /**
   * Populates the template at @index with the
   * variables set so far.
   * @returns a string with the parsed content
   * of the template.
   */
  Twitter.parseTemplate = function(index){
    if(index < this.config.templates.length){
      var template = this.config.templates[index];
      var content = template.text;
      var variables = Twitter.getTemplateVariables.call(this, index);
      var that = this;
      if(variables){
        variables.forEach(function(v){
          content = content.replace("_"+v+"_", that.config.values[v] || "");
        });

        return content; 
      }
    };
  }

  /**
   * Creates a new empty template
   */
  Twitter.addNewTemplate = function(){
    this.templateCounter = this.templateCounter || 0;
    this.templateCounter++;
    var template = {
      title: 'Template'+this.templateCounter,
      text: 'Type your tweet here. You can use _variableName_ to create dynamic content! #kitsunei'
    }

    this.config.templates.push(template);

    Twitter.renderInterface.call(this);
  };

  Twitter.toggleItems = function(editing, index){
    var btn = this.myPropertiesWindow.find("#btEdit[data-index='"+index+"']");
    if(btn){
      var icon = btn.find("i");

      icon.toggleClass("yellow save", editing);
      icon.toggleClass("edit", !editing);
    }
  }

  
  function getIndexFromElement(el){
    var index = $(el.currentTarget).attr("data-index");
    if(index.length){
      return Number(index);
    }else{
      return -1;
    }
  }

  /**
   * Shows the text area to modify the template
   */
  Twitter.editTemplate = function(el){
    var index = getIndexFromElement(el);
    if(index != -1){
      var container = this.myPropertiesWindow.find(".tweet-text-container[data-index='"+index+"']");

      if(container.length){
        var wasEditing = container.is(":visible");  
        Twitter.toggleItems.call(this, !wasEditing, index);
        if(wasEditing){
          Twitter.updateItem.call(this, index);
        }else{
          container.show(); 
        }
      }
    }
  };

  
  /**
  * Reads the interface and updates the item
  * with its contents
  */
  Twitter.updateItem = function(index){
    var item = this.myPropertiesWindow.find(".tweet-item[data-index='"+index+"']");
    if(item.length){
      var text = item.find("#txtContent").val();
      var title = item.find(".tweet-title").val();
      this.config.templates[index].text = text;
      this.config.templates[index].title = title;
      Twitter.renderInterface.call(this);
    }
  };

  // Removes one item from the array of codes
  Twitter.deleteTemplate = function(el){
    var that = this;
    // Since indices change as we add or delete
    // elements, we MUST search for the actual item
    var index = getIndexFromElement(el);
    if(index != -1){
      this.config.templates.splice(index, 1);
      Twitter.renderInterface.call(this);
    }
  }

  /**
   * Parent is send new data (using outputs).
   */
  Twitter.onNewData = function(source, data) {
    console.log("Parent block is sending: ", source, data);
  };


  return Twitter;

});
