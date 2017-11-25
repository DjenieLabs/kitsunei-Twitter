"use strict";define(["HubLink","RIB","PropertiesPanel","Easy","User"],function(t,e,i,n,o){function r(t,e){return-1!=t.action.indexOf(e)}function s(t,e){return t.action.split(e)[1]}function a(t,e){return Math.floor(Math.random()*(e-t+1)+t).toLocaleString()}function l(t){var e=$(t.currentTarget).attr("data-index");return e.length?Number(e):-1}var c=["Tweet"],u=["SendOK","SendError","NewFollower"],f={};return f.isInputBlock=!0,f.isOutputBlock=!0,f.getTemplateVariables=function(t){var e=[];if(t<this.config.templates.length)for(var i=/_(.*?)_/g,n=this.config.templates[t],o=i.exec(n.text),r="";null!==o;)r=o[1],-1===e.indexOf(r)&&e.push(r),o=i.exec(n.text);return e},f.getActions=function(){var t=c.slice(),e=this;return this.config.templates.forEach(function(i,n){t.push("Preview: "+i.title),t.push("Tweet: "+i.title);f.getTemplateVariables.call(e,n).forEach(function(e){-1===t.indexOf(e)&&t.push("Set: "+e)})}),t},f.getInputs=function(){return u},f.getDefaultAction=function(){return"Tweet"},f.onBeforeSave=function(){return this.config},f.hideDataFeed=function(){return!0},f.hasMissingProperties=function(){return 0===this.config.templates.length},f.onCancelProperties=function(){console.log("Cancelling Properties")},f.onLoad=function(){var e=this;this.config={templates:[],values:{}},t.isMinVersion("1.2.2",function(){this.storedSettings&&this.storedSettings.templates&&(this.config.templates=this.storedSettings.templates||[]),this.loadTemplate("properties.html").then(function(t){return e.propTemplate=t,e.loadTemplate("properties.html","twitter-preview").then(function(t){e.previewBox=t,f.renderInterface.call(e)})}),this.loadStyleSheet(this.basePath+"css/twitter-block-style.css").then(function(){console.log("Twitter stylesheet loaded!")}).catch(function(t){console.log("Error loading stylesheet: ",t)}),f.userAuthCheck.call(this)},function(){notification.notify("error","This block requires the Hub to be 1.2.2 or greater!"),e.deactivate()},this)},f.createStreamSubscriptions=function(){var e=this;if(!e.twitterUserInfo)return console.log("Aborting stream subscriptions, no yet authorized");return t.subscribe("service:twitter",{argvs:{type:"followersCountStream"}}).then(function(i){console.log("Event: ",i),e._subsHookId=i,t.on(i,function(t){if(t.follower&&t.followers_count){console.log("Twitter stream event: ",t);var i={newfollower:t.followers_count};e.dispatchDataFeed(i),e.processData(i)}else t.connection_dropped?(console.log("Subscription dropped by the Server!"),f.unsubscribeFromStreams.call(e,f.createStreamSubscriptions.bind(e))):console.log("Invalid event object: ",t)})}).catch(function(t){console.log("Error starting subscription: ",t)})},f.onBeforeDestroy=function(){f.unsubscribeFromStreams.call(this)},f.unsubscribeFromStreams=function(e){if(this._subsHookId){var i=this;return t.unsubscribe(this._subsHookId).then(function(){console.log("Unsubscribed from Twitter Service")}).catch(function(t){console.log("Error unsubscribing from Twitter: ",t),"function"==typeof e&&e(t)}).then(function(){console.log("Removing local subscription listener..."),t.off(i._subsHookId)?console.log("Local subscription removed!"):console.log("Error removing subscription '%s' before Twitter destruction",i._subsHookId),"function"==typeof e&&e()})}},f.userAuthCheck=function(t){var e=this;return e.authorizing=!0,f.renderInterface.call(this),console.log("Checking authorization..."),f.sendRequest.call(this,"isAuthorized").then(function(t){console.log("Authorization results: ",t),e.authorizing=!1,t.success&&t.data.success&&(e.twitterUserInfo=t.data),f.renderInterface.call(e),f.createStreamSubscriptions.call(e)}).catch(function(t){e.authorizing=!1,console.log("Error authorizing user: ",t),f.renderInterface.call(e),notification.notify("warning","Error getting the authorization. This block may not work.")})},f.onExecute=function(t){if("Tweet"===t.action)f.tweet.call(this,t.data);else if(r(t,"Set: ")){var e=s(t,"Set: ");this.config.values[e]=t.data,console.log("Values: ",this.config.values)}else if(r(t,"Preview: ")){i=s(t,"Preview: ");void 0!==(n=f.getTemplateIndexByTitle.call(this,i))&&f.showPreview.call(this,n)}else if(r(t,"Tweet: ")){var i=s(t,"Tweet: "),n=f.getTemplateIndexByTitle.call(this,i);void 0!==n&&f.tweetTemplate.call(this,n)}},f.getFollowers=function(){var t=this;return f.sendRequest.call(this,"getFollowersCount").then(function(e){if(console.log("Total Followers ",e),e.success){var i={followerscount:e.data};t.processData(i)}}).catch(function(t){notification.notify("error","Error getting the followers count"),console.log("Error getting followers count: ",t)})},f.getTemplateIndexByTitle=function(t){for(var e=0;e<this.config.templates.length;e++)if(this.config.templates[e].title===t)return e},f.tweetTemplate=function(t){var e=f.parseTemplate.call(this,t);e&&f.tweet.call(this,e)},f.tweet=function(t){var e=this;return f.sendRequest.call(this,"sendTweet",{message:t}).then(function(t){if(console.log("Send Tweet response: ",t),t.success&&t.data.success){notification.notify("success","Tweet sent!");e.processData({sendok:!0})}else notification.notify("error","Error sending tweet: "+t.reason||t.data.reason||"Unknown")}).catch(function(t){console.log("Error sending tweet: ",t);var i="Error sending tweet";t.data&&"string"==typeof t.data&&(i=t.data),notification.notify("error",i);e.processData({senderror:!0})})},f.sendRequest=function(e,i){return new Promise(function(n,o){var r={argvs:{type:e}};i&&Object.assign(r.argvs,i),t.request("service:twitter",r).then(n).catch(o)})},f.onClick=function(){f.renderInterface.call(this)},f.initAuth=function(){var t=this;return f.sendRequest.call(this,"getAuthUrl").then(function(e){if(e.success&&e.data.success){var i=window.open(e.data.url,"Authorize","location=0,status=0,width=800,height=600");if(!i)return notification.notify("warning","You seem to have a popup blocker, please disable it and try again.");setTimeout(function e(){!1!==i.closed?function(e,i,n){f.userAuthCheck.call(t)}.call(this):setTimeout(e.bind(t),200)}.bind(t),200)}else console.log("Invalid response: ",e),notification.notify("error","Error initiating redirection"),f.renderInterface.call(t)}).catch(function(e){console.log("Error getting auth url: ",e),notification.notify("error","Error initiating authorization"),f.renderInterface.call(t)})},f.renderInterface=function(){var t=this;this.propTemplate&&i.isVisible()&&(n.clearAll(),this.myPropertiesWindow=$(this.propTemplate(this)),this.myPropertiesWindow.find("#btAdd").click(f.addNewTemplate.bind(this)),this.myPropertiesWindow.find("#btEdit").click(f.editTemplate.bind(this)),this.myPropertiesWindow.find("#btDelete").click(f.deleteTemplate.bind(this)),this.myPropertiesWindow.find(".tweet-title").focusout(function(e){var i=l(e);f.updateItem.call(t,i)}),this.myPropertiesWindow.find("#btAuthorize").click(function(e){$(this).addClass("disabled loading"),f.initAuth.call(t)}),n.displayCustomSettings(this.myPropertiesWindow,!0,!0))},f.showPreview=function(t){if(this.previewBox){var e=f.parseTemplate.call(this,t);if(e){var i=moment().format("h:mm A - MMM Do YYYY"),n={basePath:this.basePath,twitterUserInfo:this.twitterUserInfo,contentInit:e.substr(0,200),contentLast:e.substr(201),date:i,replies:a(2,200),retweets:a(200,2e3),likes:a(200,3e4)};this.previewWindow=$(this.previewBox(n));var o=this.previewWindow.closest("#msg-tweet-preview"),r=$("#msg-tweet-preview");r.length&&(o.css("left",r.position().left+"px"),o.css("top",r.position().top+"px"),r.remove()),o.find("#tweet-close-btn").click(function(){o.remove()}),o.appendTo("body"),o.draggable({handle:".header"})}}},f.parseTemplate=function(t){if(t<this.config.templates.length){var e=this.config.templates[t].text,i=f.getTemplateVariables.call(this,t),n=this;if(i)return i.forEach(function(t){e=e.replace("_"+t+"_",n.config.values[t]||"")}),e}},f.addNewTemplate=function(){this.templateCounter=this.templateCounter||0,this.templateCounter++;var t={title:"Template"+this.templateCounter,text:"Type your tweet here. You can use _variableName_ to create dynamic content! #kitsunei"};this.config.templates.push(t),f.renderInterface.call(this)},f.toggleItems=function(t,e){var i=this.myPropertiesWindow.find("#btEdit[data-index='"+e+"']");if(i){var n=i.find("i");n.toggleClass("yellow save",t),n.toggleClass("edit",!t)}},f.editTemplate=function(t){var e=l(t);if(-1!=e){var i=this.myPropertiesWindow.find(".tweet-text-container[data-index='"+e+"']");if(i.length){var n=i.is(":visible");f.toggleItems.call(this,!n,e),n?f.updateItem.call(this,e):i.show()}}},f.updateItem=function(t){var e=this.myPropertiesWindow.find(".tweet-item[data-index='"+t+"']");if(e.length){var i=e.find("#txtContent").val(),n=e.find(".tweet-title").val();this.config.templates[t].text=i,this.config.templates[t].title=n,f.renderInterface.call(this)}},f.deleteTemplate=function(t){var e=l(t);-1!=e&&(this.config.templates.splice(e,1),f.renderInterface.call(this))},f.onNewData=function(t,e){console.log("Parent block is sending: ",t,e)},f});