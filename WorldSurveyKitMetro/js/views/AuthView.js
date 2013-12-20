﻿// Auth View - used to get facebook credentials then pass token back to the server to authorize access
// ===================================================================================================

define(["jquery", "backbone", "models/Models", "collections/MyOrgsCollection"], function ($, Backbone, Models, MyOrgsCollection) {
   
    var AuthView = Backbone.View.extend({

        el: ".daBody",

        events: {
            "click .loginBtn": "login",
            "click .logoutBtn": "logout"
        },

        initialize: function () {
            
            //$.mobile.loading("show", {
            //    text: "Loading...",
            //    textVisible: true,
            //    theme: "a"

            //});

            // set up mobile services
            App.mobileService = new WindowsAzure.MobileServiceClient(
                "https://wskauth.azure-mobile.net/",
                "XEsEVgcJInlpsRqIkHHRgtBwVubnLc42"
            );
            
        },

        start: function() {

            //console.log("Last User: " + window.localStorage.lastUser);

            // see if the user is already logged in with facebook

            var self = this;

            // url build helper
            App.utils.urlify = function (apiUrl) {
                var url;
                if (App.rootUrl) {
                    url = App.rootUrl + "/api/" + apiUrl;
                }
                else {
                    url = "/api/" + apiUrl;
                }

                return url;
            };



            // offline mode
            if (App.networkState == 'none') {

                // user obj
                if (!App.user) {
                    App.user = new FacebookUser(); // model
                }
                
                // try to auto logon

                // check state
                if (window.localStorage.lastUser) {
                    App.uid = window.localStorage.lastUser;
                    App.userName = window.localStorage.userName;
                    App.id = window.localStorage.id;
                    App.defaultOrg = window.localStorage.defaultOrg;
                    App.defaultOrgName = window.localStorage.defaultOrgName;

                    App.authView.fbConnected();
                }
                else {
                    $.mobile.loading("hide");
                    alert("Cannot connect :( Please try again later.");

                }

            }
            // online mode
            else {

                // user obj
                if (!App.user) {
                    App.user = new FacebookUser(); // model
                }

                // check state / bind to facebook logon/logoff/unauth events
                App.user.off('facebook:connected');
                App.user.on('facebook:connected', App.authView.fbConnected, this);
                App.user.off('facebook:disconnected');
                App.user.on('facebook:disconnected', App.authView.fbDisconnected, this);
                App.user.off('facebook:unauthorized');
                App.user.on('facebook:unauthorized', App.authView.fbUnauthorized, this);


                // Check the login status, the event will fire fbConnected, fbDisconnected or fbUnauthorized
                App.user.updateLoginStatus();

                // Get rid of loading spinner now that most js is loaded - TODO use a deferred promise to make this more precise
                $(".loginBtnText").html("&nbsp;&nbsp;Login");

            }

           

        },

        render: function () {
            
            //console.log("====> Render AuthView");

            // this view simply displays the user name and pic if logged in
            // if you are not logged it it takes it away

            // user 
            //if (App.user.get('id')) {
            if (App.uid) {
               
                var picUrl;

                try{
                    //picUrl = App.user.get('pictures');
                    //picUrl = picUrl.small;
                    picUrl = "https://graph.facebook.com/" + App.uid + "/picture?type=small";
                }
                catch (e){
                    
                    picUrl = "images/lumbergh.jpg";
     
                }
                
                
                //$("div[data-role='fblogin']").html(
                //       //"<div id='logout' style='padding: 5px 5px 5px 5px' ><img src='" + picUrl + "' style='width:25px; height:25px;' />&nbsp;&nbsp; " + App.userName + "</div>"
                //    '<button data-mini="true" data-icon="home" data-corners="false" onclick=" App.router.navigate(\'home\', { trigger: true }) ">' + App.userName +
                //        '&nbsp;&nbsp;<img src="' + picUrl + '" style="width:18px;height:18px" />' +
                //    '</button>'
                //);

               
                    

                $("div[data-role='fblogin']").html(
                    '<div data-role="controlgroup" data-type="horizontal" data-mini="true" class="ui-btn-right" >' +
                        '<a data-role="button" data-mini="true" data-theme="b" onclick=" App.router.navigate(\'home\', { trigger: true }) " ><img src="images/home.png" style="width:18px;height:18px" /></a>' +
                        '<a data-role="button" class="profiledd" data-mini="true" data-icon="arrow-d" data-iconpos="right"  >' +
                            '<img src="' + picUrl + '" style="width:18px;height:18px" />&nbsp;&nbsp;' + App.userName + '&nbsp;&nbsp;' +
                        '</a>' +
                    '</div>'
                );

                $("#login").trigger("create");

            }
            // no user
            else {
                $("div[data-role='fblogin']").html(
                     '<button class="loginBtn" data-mini="true" data-corners="false"> ' +
                        '<img src="images/facebook_login_sm.png" style="width:18px;height:18px" />&nbsp;&nbsp; Login' +
                    '</button>'
                );

                $("#login").trigger("create");

            }


            return this;

        },


        fbConnected: function (model, response) {

            //console.log('=====> fbConnected called');

            ////console.log(App.user.get("access_token"));

            var self = this;
            var authViewCopy = App.authView;

            // Offline 
            // Already Authorized because window.localStorage.lastUser exists
            if (App.networkState == 'none') {

                //console.log("=====> offline authorization mode");

                //clear background image
                $(".backstretch").hide();

                // start the router
                require(["router"], function (Router) {
                    if (!App.router) {
                        App.router = new Router();
                    }
                });

                App.uid = window.localStorage.lastUser;
                App.userName = window.localStorage.userName;
                App.id = window.localStorage.id;
                App.defaultOrg = window.localStorage.defaultOrg;
                App.defaultOrgName = window.localStorage.defaultOrgName;

                App.authView.render();

                var hash = '';
                // change to the url requested, redirect if needed
                if (!window.location.hash) {
                    hash = "#home";
                }
                else {
                    hash = window.location.hash;
                }
                $.mobile.changePage(hash, { reverse: false, changeHash: false });

                
                
            }
            // Online
            // Check if the user is authorized by caling this.isAuthroized to query /api/whoami and pass tokens
            else {

                //console.log("=====> online authorization mode");

                $.mobile.loading("show", {
                    text: "Authorizing...",
                    textVisible: true,
                    theme: "a"
                });

                App.authView.isAuthorized().done(function (data, textStatus, jqXHR) {
                    $.mobile.loading("hide");
                    // Success, Your Authorized

                    $(".notAuth").css("display", "none");
                    $(".logoutBtn").html("Logoff");

                    App.isAdmin = data.IsAdmin;
                    App.id = data.Id;
                    App.defaultOrg = data.defaultOrg;
                    App.defaultOrgName = data.defaultOrgName;
                    App.isSystemAdmin = data.isSystemAdmin;
                    App.myOrgs = data.org;

                    App.myOrgsCollection = new MyOrgsCollection(data.org);


                    window.localStorage.id = App.id;
                    window.localStorage.defaultOrg = App.defaultOrg;
                    window.localStorage.defaultOrgName = App.defaultOrgName;
                    
                    App.referrerUrl = data.referrerUrl;
                    App.hash = "";
                    // change to the url requested, redirect if needed

                    // no hash , go home
                    if (!window.location.hash) {
                        App.hash = "#home";
                        $.mobile.changePage("#home", { reverse: false, changeHash: false });
                    }
                    else { // hash 
                        // new survey created, nav to the new survey
                        if (App.referrerUrl != "" && App.referrerUrl != null && App.referrerUrl != undefined) {
                            //App.hash = App.referrerUrl;
                            window.location.hash = "#home";
                            //$.mobile.changePage("#go", { reverse: false, changeHash: false });
                            $.mobile.changePage("#home", { reverse: false, changeHash: false });
                        }
                        else { // nav to deep linked hash
                            App.hash = window.location.hash;
                            $.mobile.changePage(App.hash, { reverse: false, changeHash: false });
                        }
                    }


                    //clear background image
                    $(".backstretch").hide();

                    try {
                        Backbone.history.start();
                    }
                    catch (e) {

                    }

                    console.log('b4 App.user.fetch');

                    $.get('https://graph.facebook.com/me' + "?access_token=" + App.user.get("access_token"), function (response) {
                        // Save the uid
                        window.localStorage.lastUser = response.id;
                        window.localStorage.userName = response.name;
                        App.uid = response.id;
                        App.userName = response.name;

                        // update the pic and user name
                        App.authView.render();

                        // start the router now that we have a Users Id
                        require(["router"], function (Router) {
                            if (!App.router) {
                                App.router = new Router();
                            }

                        });
                    });


                }).fail(function (jqXHR, textStatus, errorThrown) {

                    // Error / Not Authorized
                    $.mobile.loading("hide");
                    console.log(errorThrown);

                    if (jqXHR.status == "417") {

                        $(".notAuth").removeAttr("style");

                    }
                    else {

                        $(".notAuth").removeAttr("style");
                        $(".notAuth").append(" -  " + errorThrown);


                    }
                });
            }
 

        },

        fbDisconnected: function (model, response) {

            //console.log('======> fbDisConnected called');

            // set to nothing since the user forced a logoff
            window.localStorage.lastUser = "";
            window.localStorage.userName = "";
            window.localStorage.id = "";
            window.localStorage.defaultOrg = "";
            window.localStorage.defaultOrgName = "";

            App.uid = "";
            App.userName = "";
            App.id ="";
            App.defaultOrg = "";
            App.defaultOrgName = "";

            //App.backStretch = $.backstretch("images/sky.jpg");
            $(".backstretch").show();

           

            try {
                Backbone.history.stop();
            }
            catch (e) {

            }

            // update the pic and user name
            App.authView.render();

            $.mobile.changePage(App.loginPageHash, { reverse: false, changeHash: false });

  
            $(App.loginPageHash).trigger("create");

            $.mobile.loading("hide");

        },

        fbUnauthorized: function (model, response) {

            //console.log('======> fbUnauthorized called');
            $.mobile.loading("hide");

        },

        fbCancel: function(){

            //cancel button was pressed on the FB login dialog
            $(".loginBtnText").html("&nbsp;&nbsp;Login");
            $.mobile.loading("hide");

        },

    
        // contact the api to see if we are authorized to use it
        // by using backbone which is configured to use
        // FbToken and ApiToken headers, returns a Deferred Ajax object
        isAuthorized: function () {

            var fbToken = App.user.get("access_token");
            var apiToken = $("#__ApiToken").val();

            $(document).ajaxSend(function (e, xhr, options) {
                xhr.setRequestHeader("ApiToken", apiToken);
                xhr.setRequestHeader("FbToken", fbToken);
            });

            var url;
            if (App.rootUrl) {
                url = App.rootUrl + "/api/whoami";
            }
            else {
                url = "/api/whoami";
            }

            var hash = window.location.hash;
            // check if the user is deep linking a new survey from a friend /#s?{fileIdInt}
            if (/\#s\?[0-9]/.test(hash)) {
                var newFileId = hash.split("?"); // split by ? ,
                //console.log(newFileId);
                newFileId = newFileId[1]; // exp: #s?435  [0] = #s [1] = 435
                newFileId = newFileId.split("&"); // exp: 435&referer=facebook   [0] = 435  [1] = referer=facebook
                newFileId = newFileId[0]; // this is what we want! 435 or {fileIdInt}
                //console.log(newFileId);

                if ($.isNumeric(newFileId)) {
                    url = url + "?s=" + newFileId;
                }
            }
            
            
            

            //console.log("url - " + url);

            // returned a jQuery deferred ajax object so we can call success on it
            return $.ajax(url, {
                type: "GET",
                contentType: "application/json",
                data: {}, 
                dataType: "json",
                headers: {
                    'ApiToken': apiToken,
                    'FbToken': fbToken
                }

            });


        },

        login: function () {

            $(".loginBtnText").html("&nbsp;&nbsp;<img src='images/loadingSm.gif' />");

            //App.user.login(function (response) {

            //    if (response.authResponse) {
            //        // call for android since it does not properly handle the facebook:connected event
            //        if (App.platform == "Android") {
            //            App.authView.fbConnected();
            //        }
            //    } else {

            //        //alert('User cancelled login or did not fully authorize.');
            //        self.fbCancel();

            //    }

            //});

            // azure mobile services stuff
            App.mobileService.login("facebook" ).done(function (response) {
                //console.log('azure logged');
                
             
                // now get your fb token
                var table = App.mobileService.getTable("Identities");
                table.read().done(function (results) {
                    console.log('azure logged back');
                    var token = results[0].identities.facebook.accessToken;
                    console.log(token);
                    App.user.set({ "access_token": token });
                    App.authView.fbConnected();
                });

                
            });
  
        },

        logout: function () {

            $(".logoutBtn").append("&nbsp;&nbsp;<img src='images/loadingSm.gif'/>");

            if (App.networkState == 'none') {
                App.authView.fbDisconnected();
            }
            else {
                //console.log("=====> logoff");

                //App.user.logout(function () {
                //    // call for android since it does not properly handle the facebook:disconnected event
                //    if (App.platform == "Android") {
                //        App.authView.fbDisconnected();

                //    }

                //    $.wait(1500).then(function () {
                //        window.location.reload();
                //    });


                //});


                // azure mobile services stuff
                App.mobileService.logout();
                App.authView.fbDisconnected();

            }

        }


    });

    return AuthView;

});
