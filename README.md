GAuth
=====

[![Build Status](https://travis-ci.org/gbraad/gauth.svg?branch=master)](https://travis-ci.org/gbraad/html5-google-authenticator)
[![Build Status](https://drone.io/github.com/gbraad/html5-google-authenticator/status.png)](https://drone.io/github.com/gbraad/html5-google-authenticator/latest)
[![Stories in Ready](https://badge.waffle.io/gbraad/gauth.png?label=ready&title=Ready)](https://waffle.io/gbraad/gauth)
[![Code Climate](https://codeclimate.com/github/gbraad/html5-google-authenticator/badges/gpa.svg)](https://codeclimate.com/github/gbraad/html5-google-authenticator)


A simple application for multi-factor authentication, written in HTML using
jQuery Mobile, jsSHA, LocalStorage and Application Cache. It implements the 
TOTP  (Time-Based One-Time Password) algorithm according to [RFC6238](https://tools.ietf.org/html/rfc6238)
 and has been tested to work with Google Authenticator, Dropbox, Dreamhost,
 Amazon, Linode, Okta and many other services.


* [Supported services](https://github.com/gbraad/gauth/wiki/Supported-services)
* [Hosted web application](http://gauth.apps.gbraad.nl "Hosted web application")
* [Hosted](https://marketplace.firefox.com/app/gauth "Firefox Web Application") and [Packaged](https://marketplace.firefox.com/app/gauth-packaged/ "Firefox Packaged Application") application for Firefox and Firefox OS
* [Application](https://chrome.google.com/webstore/detail/gauth-authenticator/jcmgkikfgdbehjdajjdnebnnmmknfblm "Chrome application") and [Extension](https://chrome.google.com/webstore/detail/ilgcnhelpchnceeipipijaljkblbcobl "Chrome extension") for Chrome and Chrome OS
* [5Apps packaged apps](https://5apps.com/gbraad/gauth "5Apps packages") for Chrome and Firefox
* [PhoneGap builds](http://build.phonegap.com/apps/135419/share "PhoneGap Build") for WebOS and Android

More information can be found in the about dialog and the [wiki](https://github.com/gbraad/gauth/wiki "GAuth wiki").


Hosting
-------

To self-host a version of this application you can do so by just serving the files using Apache or nginx. For easy deployment, there is also a server.js node application which can be hosted from a nodejs 0.10-based container. This has been tested on Heroku/Dokku and OpenShift.

An experimental package for deployment on a local machine is available from [packager.io](https://packager.io/gh/gbraad/gauth/).


Authors
-------

| [!["Gerard Braad"](http://gravatar.com/avatar/e466994eea3c2a1672564e45aca844d0.png?s=60)](http://gbraad.nl "Gerard Braad <me@gbraad.nl>") |
|---|
| [@gbraad](https://twitter.com/gbraad)  |


Donations
---------
A small donation to show appreciation is always welcome.

[![Gratipay tip](https://img.shields.io/gratipay/gbraad.svg)](https://gratipay.com/gbraad)
[![Flattr this](http://api.flattr.com/button/flattr-badge-large.png)](http://flattr.com/thing/717982/GAuth-Authenticator)
[![PayPal donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=me%40gbraad%2enl&lc=US&item_name=gbraad&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_SM%2egif%3aNonHosted)


Contributors
------------
Matěj Cepl


Contact
-------
If you have problems with the application, please first consult the
[Issue tracker](https://github.com/gbraad/gauth/issues "Issue tracker")
at Github. You can also send me an email, PM me on Freenode or drop by in the chatroom.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/gbraad/gauth?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)


License
-------
Licensed under the [GPL license][GPL].
[GPL]: http://www.gnu.org/licenses/gpl.html
