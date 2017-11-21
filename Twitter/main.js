define(['HubLink', 'RIB', 'PropertiesPanel', 'Easy'], function(Hub, RIB, Ppanel, easy) {

  // Tweet: Sends whatever data arrives.
  // GetFollowers: Produces an event to the 'FollowerCount' input with the current
  // number of followers.
  // Preview (added dynamically): Simulates a Tweet event but shows a popup with the tweet instead
  // of sending it.
  var actions = ["Tweet", "GetFollowersCount"];
  var inputs = ["SendOK", "SendError", "FollowerCount", "Mention"];
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
   * Intercepts the properties panel save action.
   * You must call the save method directly for the
   * new values to be sent to hardware blocks.
   * @param settings is an object with the values
   * of the elements rendered in the interface.
   * NOTE: For the settings object to contain anything
   * you MUST have rendered the panel using standard
   * ways (easy.showBaseSettings and easy.renderCustomSettings)
   */
  Twitter.onSaveProperties = function(settings) {
    this.settings = settings;
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
    this.config = {
      templates: [],
      values: {}
    };

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
      });
    });

    this.loadStyleSheet(this.basePath + "css/twitter-block-style.css").then(function(){
      console.log("Twitter stylesheet loaded!")
    }).catch(function(e){
      console.log("Error loading stylesheet: ", e);
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
      Twitter.sendRequest.call(this, 'sendTweet', event.data).then(function(r){
        console.log("Tweet sent! ", r);
      }).catch(function(e){
        notification.notify( 'error', 'Error sending tweet' );
        console.log("Error sending tweet: ", e);
      });
    }else if(event.action === 'GetFollowersCount'){
      Twitter.sendRequest.call(this, 'getFollowersCount').then(function(r){
        console.log("Total Followers ", r);
      }).catch(function(e){
        notification.notify( 'error', 'Error getting the followers count' );
        console.log("Error getting followers count: ", e);
      });
    }else if(event.action.indexOf("Set: ") != -1){
      var sp = event.action.split("Set: ");
      var varName = sp[1];
      this.config.values[varName] = event.data;
      console.log("Values: ", this.config.values);
    }else if(event.action.indexOf("Preview: ") != -1){
      var sp = event.action.split("Preview: ");
      var title = sp[1];
      var index = Twitter.getTemplateIndexByTitle.call(this, title);
      if(index !== undefined){
        Twitter.showPreview.call(this, index);
      }
    }
  };

  
  Twitter.getTemplateIndexByTitle = function(title){
    for(var i = 0; i < this.config.templates.length; i++){
      if(this.config.templates[i].title === title){
        return i;
      }
    }
  };

  /**
   * Makes an API request.
   */
  Twitter.sendRequest = function (type, options){
    var parameters = {argvs: {type: type}};
    if(options){
      Object.assign(parameters, options);
    }
    
    Hub.request('service:twitter', parameters).then(function(res){
      console.log("Message sent! ", res);
    }).catch(function(err){
      notification.notify( 'error', 'Error saving new events.' );
      console.log("Hook Error: ", err);
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

  Twitter.renderPreview = function(){

  }
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
          username: 'alexagu',
          contentInit: parsedTemplate.substr(0, 200),
          contentLast: parsedTemplate.substr(201),
          date: d,
          replies: getRandomNum(2, 200),
          retweets: getRandomNum(200, 2000),
          likes: getRandomNum(200, 30000),
        }
        this.previewWindow = $(this.previewBox(params));
        // this.myPropertiesWindow.append(this.previewWindow);
        var modalBox = this.previewWindow.closest("#msgPreview");
        // this.previewWindow.find(".content").html(parsedTemplate);
        modalBox.modal({
          inverted: true,
          transition: 'scale',
          onHidden: function(){
            modalBox.remove();
          }
        }).modal('show');
      }
    }
  };

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
    var template = {
      title: '',
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
  Twitter.onNewData = function() {

  };

  /**
   * Blocks have the ability to be replaced by other blocks
   * by dragging and dropping a block from the left panel
   * onto the canvas instance. This is useful when for example
   * you move a hardware block to a different radio. Since
   * once powered up again, it will appear as a different block
   * (because it now belongs to a different node), rather than
   * adding the new block to the canvas and copy the logic from 
   * the offline one, you can just drag and drop the new
   * block onto the offline instance in your canvas; this will
   * associate the offline block with the online instance, hence
   * making it appear online again.
   * 
   * This is also true for virtual blocks in cases when you create
   * a virtual block that uses a hardware one.
   * 
   * In this method you need to return an array of numbers
   * that correspond to the serial number of the blocks you want
   * to accept. Hardware blocks don't need to return their serial
   * number as they are accepted by default.
   */
  
  /**
   * A copy has been dropped on the canvas.
   * I need to keep a copy of the processor to be triggered when
   * new data arrives.
   */
  Twitter.onAddedToCanvas = function() {

  };



  return Twitter;

});
