World Survey Kit - For Windows 8 
================================
I had to change a number of things in my code for my PhoneGap build app to work in a Windows Store environment. Unfortunatley it does not just work out of the box (come on msft :( ).
Below are some of the issues I ran into:

1. jQuery - special version (jquery-1.8.0-windows8-ready.js)
2. iFrames
3. Facebook Authenication with the FB Javascript SDK


To make Facebook Authentication work in a PhoneGap Windows 8 Store app
------------------------------------------------------------------------

* Create Azure Mobile Service http://code.msdn.microsoft.com/windowsapps/Authenticate-Account-827dd37b
* Change the logic code in Auth.js to first authenicate with mobile services then pass the token back to the client:

```javascript
	
	// set up mobile services
    App.mobileService = new WindowsAzure.MobileServiceClient(
		"https://wskauth.azure-mobile.net",
        "XEsEVgcJInlpsRqIkHHRgtBwVubnLc42"
    );

    App.mobileService.login("facebook").then(function () {
		App.authView.fbConnected();
    });
	
```


Other things I had to modify
----------------------------

* When in doubt and you get a javascript exception while debuggin try wrapping your code in this call:
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

* I had to remove all the iframes in the application. I read there is a workaround online, but did not bother to implement, I simply removed the youtube iframes.

* Removed the export to csv functionality since it has to do a full page post back to a web page on a different domain, there is a possible workaround I did not 
investigate yet.

TODO
-----
Add logic to persist the login token, but also check if it has expired
Issues w import and export (hid the buttons for now)

