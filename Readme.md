How I converted my jQuery, PhoneGap, RequireJS app to a Windows 8 Store App (The pain, struggle and glory)
=========================================================================================================
I had to change a number of things in my World Survey Kit application code for it to work in a Windows Store environment. Unfortunatley it does not just work out of the box...come on m$ft :( 
Below are some of the issues I ran into: 

1. jQuery - special version needed (jquery-1.8.0-windows8-ready.js)
2. Facebook Authenication with the FB Javascript SDK issues
3. Windows App Cerification Kit issues (wack) ... this part is wack yo!
4. iFrame issues


jQuery for Windows 8
--------------------
I had to get a special version of jquery for windows 8 here: https://github.com/appendto/jquery-win8

* When in doubt and you get a javascript exception while debugging try wrapping your code in this call:
```javascript
	MSApp.execUnsafeLocalFunction(function () {
		// your code
	});
```

* When using jquery append, sometimes you need to sanitize your html with this code: `.append(toStaticHTML("<br/>stuff"));`

* Changed getting data from facebook by passing in the access token and avoided using the fb js sdk. Changed FB.api(/me) code to:
```javascript
	$.get('https://graph.facebook.com/' + fid + "?access_token=" + YOUR_TOKEN, function (r) {
		name = "<br/>" + r.name;
		$("#activityFeed").append(toStaticHTML(name));
	});
```

* I had to wrap line 3061 of `jquery-1.8.0-windows8-ready.js` in a try-catch to avoid an error.
```javascript
	// nick added try-catch... for some reason an error was being thrown 0x800a01b6 
	//  - JavaScript runtime error: Object doesn't support property or method 'apply'
	try{
		ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler)
			    .apply(matched.elem, args);
	}
	catch (e) {
		ret = undefined;
	}
```


To make Facebook Authentication work in a PhoneGap Windows 8 Store app
------------------------------------------------------------------------
I had to abandon the Facebook JS SDK for login and instead use Azure Mobile Services to do the autehnication because I could not get the Facebook popup iframe to work.

* Create Azure Mobile Service http://code.msdn.microsoft.com/windowsapps/Authenticate-Account-827dd37b
* Change the logic code in Auth.js to first authenicate with mobile services then pass the token back to the client:

```javascript
	
	// set up mobile services
    App.mobileService = new WindowsAzure.MobileServiceClient(
		"https://wskauth.azure-mobile.net",
        "ENTER_YOUR_CODE"
    );

    App.mobileService.login("facebook").then(function () {
		App.authView.fbConnected();
    });
	
```


To Pass the Windows App Certification
--------------------------------------
* I had to convert a bunch of files to UTF-8. To automate this is wrote a powershell command.

```powershell
	$files = Get-ChildItem 'D:\website\WorldSurveyKitMetro\WorldSurveyKitMetro\js' -Recurse | ? {Test-Path $_.FullName -PathType Leaf} 
	foreach($file in $files) { $content = Get-Content $file.FullName; $content | Out-File $file.FullName -Encoding utf8 }
	
	$files = Get-ChildItem 'D:\website\WorldSurveyKitMetro\WorldSurveyKitMetro\index.html' -Recurse | ? {Test-Path $_.FullName -PathType Leaf} 
	foreach($file in $files) { $content = Get-Content $file.FullName; $content | Out-File $file.FullName -Encoding utf8 }
	
	$files = Get-ChildItem 'D:\website\WorldSurveyKitMetro\WorldSurveyKitMetro\Content\themes\base' -Recurse | ? {Test-Path $_.FullName -PathType Leaf} 
	foreach($file in $files) { $content = Get-Content $file.FullName; $content | Out-File $file.FullName -Encoding utf8 }
```
* Run js lint on your javascript files and fix any errors. Most of my errors were missing semi-colons.
* To pass the " Performace Launch Test "  I had to add a few lines of code to the Default.js file to open up a requirejs module after suspend or launch:


`default.js`

```javascript
	// For an introduction to the Blank template, see the following documentation:
	// http://go.microsoft.com/fwlink/?LinkId=232509
	(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
                require(["main"]);
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
                require(["main"]);
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };


    // privacy policy charm
    WinJS.Application.onsettings = function (e) {
        e.detail.e.request.applicationCommands.append(new Windows.UI.ApplicationSettings.SettingsCommand('Privacy policy', 'Privacy policy', function () {
            Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri('https://worldsurveykit.com/privacy.html'));
        }));
    };

    app.start();
	})();
```
* To pass the human test I had to provide a test account for the test to log in as. 
I use facebook authenication so I was able to create a test user account through the facebook app developer portal and provided it in the "Notes to Tester” section of App certification.
* I thought I could pass the certification without a privacy policy... but apparently not. Make sure you you add a charm to your app and a link to a privacy policy (I simply used one I found online... check it out here worldsurveykit.com/privacy.html). The code to add is above under `privacy policy charm'
* Now your app should pass the tedious certification process!



iframe issue
----------------------------
* I had to remove all the iframes in the application. I read there is a workaround online, but did not bother to implement, I simply removed the youtube iframes.
* I also removed google analytics and google translate.
* Removed the export to csv functionality since it has to do a full page post back to a web page on a different domain, there is a possible workaround I did not 
investigate yet.




TODO
-----
* Add logic to persist the login token, but also check if it has expired
* Issues with import and export (hid the buttons for now)
* iFrame workaround
