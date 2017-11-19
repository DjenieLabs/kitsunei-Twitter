define(['HubLink', 'RIB', 'PropertiesPanel', 'Easy'], function(Hub, RIB, Ppanel, easy) {

  // Tweet: Sends whatever data arrives.
  // GetFollowers: Produces an event to the 'FollowerCount' input with the current
  // number of followers.
  // Preview: Simulates a Tweet event but shows a popup with the tweet instead
  // of sending it.
  var actions = ["Tweet", "GetFollowers", "Preview"];
  var inputs = ["SendOK", "SendError", "FollowerCount", "Mention"];
  var _objects = {};

  var Twitter = {};


  // Set if the blocks is Input and/or Output
  Twitter.isInputBlock = true;
  Twitter.isOutputBlock = true;

  // TODO: Review if this is a trully unique instance?

  Twitter.getActions = function() {
    var list = actions.splice(0);
    // Extract the list of variables
    this.settings.templates.forEach(function(t){
      var reg = /_(.*?)_/g;
      var match = reg.exec(t);
      var group = '';
      while(match !== null){
        group = match[0];
        // Make sure the variable isn't already added.
        if(list.indexOf(group) === -1){
          // Pushing the group name
        list.push(group);
        }
      }
    });

    return list;
  };

  Twitter.getInputs = function() {
    return inputs;
  };

  /**
   * (OPTIONAL)
   * Called when no logic has been added in the Logic Maker.
   * Here you can define the default input to use to send
   * data to any child block connected to this block's canvas.
   * IMPORTANT: Output Blocks SHOULD NOT have this method
   */
  // Twitter.getDefaultInput = function() {
  //   return "";
  // };

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
    return this.settings;
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
    return this.settings.templates.length === 0;
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

    this.settings.templates = [];

    // Load previously stored settings
    if (this.storedSettings && this.storedSettings.templates) {
      this.settings.templates = this.storedSettings.templates || [];
    }

    // Load our properties template and keep it in memory
    this.loadTemplate('properties.html').then(function(template) {
      that.propTemplate = template;
    });
  };


  /**
   * Allows blocks controllers to change the content
   * inside the Logic Maker container
   */
  // Twitter.lmContentOverride = function() {
  //   // Use this to inject your custom HTML into the Logic Maker screen.
  //   return "";
  // };

  /**
   * Parent is asking me to execute my logic.
   * This block only initiate processing with
   * actions from the hardware.
   */
  Twitter.onExecute = function(event) {
    if(event.action === 'Tweet'){
      // Sends whatever data arrive.
    }else if(event.action === 'Populate'){

    }
  };


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
    renderInterface.call(this);
  };

  /**
   * Helper method to populate the properties panel.
   */
  Twitter.renderInterface = function(){
    if(!this.propTemplate) return;
    easy.clearCustomSettingsPanel();
    // Compile template using current list
    this.myPropertiesWindow = $(this.propTemplate(this.settings));
    // FIXME: For some reason .find(#msgModal) is not working
    this.modalWindow = $(this.myPropertiesWindow[0]);

    // Interface event handlers
    this.myPropertiesWindow.find("#btAdd").click(addNewTemplate.bind(this));
    this.myPropertiesWindow.find("#btEdit").click(function(){
      Twitter.editTemplate.call(that, this);
    });
    this.myPropertiesWindow.find("#btDelete").click(function(){
      Twitter.deleteTemplate.call(that, this);
    });
  };

  Twitter.addNewTemplate = function(){
    var template = {
      title: '',
      text: 'Type your tweet here. You can use _variableName_ to create dynamic content! #kitsunei'
    }

    this.settings.templates.push(template);

    this.controller.renderInterface.call(this);
  };

  /**
   * Shows the text area to modify the template
   */
  Twitter.editTemplate = function(index){
    var content = this.myPropertiesWindow.find("#txtContent");
    content.show();
  };

  // Removes one item from the array of codes
  Twitter.deleteTemplate = function(el){
    var that = this;
    // Since indices change as we add or delete
    // elements, we MUST search for the actual item
    var index = $(el).attr("data-index");
    if(index !== undefined){
      this.settings.templates.splice(index);
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



  /**
   * This method is called when the user hits the "Save"
   * recipe button. Any object you return will be stored
   * in the recipe and can be retrieved during startup (@onLoad) time.
   * Be aware that only primitive properties are stored
   * (Numbers, Strings)
   */
  Twitter.onBeforeSave = function(){
    return {
      txtTitle: this._txtTitle
    };
  };




  return Twitter;

});
