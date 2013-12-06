To make Facebook Authentication work
--------------------------------------

* Create Azure Mobile Service http://code.msdn.microsoft.com/windowsapps/Authenticate-Account-827dd37b
* Change code in Auth.js:

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

Things i had to modify
-----------------------

* .append(toStaticHTML("<br/>stuff"));
* FB.api(/me) to  
	$.get('https://graph.facebook.com/' + fid + "?access_token=" + YOUR_TOKEN, function (r) {
		name = "<br/>" + r.name;
		$("#activityFeed").append(toStaticHTML(name));
	});

Todo
-----

* make the FB.api calls work by researching if we need to proxy through mobile services
* check why the popups in jquery mobile cause an error
* back button not working