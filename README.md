# 🤖 Wit.ai Integrated Bot Project

In the Heroku Dashboard (Your Project > Settings > Config Variables) make sure to set the following..

 * FB_APP_SECRET (found at https://developers.facebook.com > App Dashboard)
 * FB_PAGE_TOKEN (found at (https://developers.facebook.com > App Dashboard > Products | Messenger > Token Generation))
 * FB_VERIFY_TOKEN (same string you used to attach your webook callback URL - default floating in tutorials is 'my_voice_is_my_password_verify_me')
 * WIT_TOKEN (found in wit.ai > API Details > Server Access Token)



``` 
Install [Heroku Toolbelt](https://devcenter.heroku.com/articles/heroku-command-line)
Sign up to Heroku if you haven't already

Wit.ai Project - https://wit.ai/dougiesilkstone/Cthulhu

cd voucherbot
npm install
heroku create
git commit -m 'xyz'
git push heroku master


Use heroku logs -t to get realtime access to heroku logs.


Syntax issues locally? Update to 6.6.x Node - 
<<<<<<< HEAD
Ended up using the Node Harmony Example to allow ES6 code to run on Heroku - package.json should reflect that. 
=======
Ended up using the Node Harmony Example to allow ES6 code to run on Heroku - package.json should reflect that
>>>>>>> 71286720f09bfe0cb25bbc9587832b11ef40805c
```



