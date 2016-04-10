# Vapour

A Chrome extension to browse achievement progress on Steam.

## Requirements

* [Bootstrap](http://getbootstrap.com)
* [Font Awesome](http://fontawesome.io)
* [jQuery](http://jquery.com)

The minimum set of files should be laid out inside the Vapour folder as follows:

* lib
  * css
    * bootstrap.min.css
    * font-awesome.min.css
  * fonts
    * fontawesome-webfont.woff2
  * js
    * bootstrap.min.js
    * jquery.min.js

## Reading stats

All stats are retrieved locally, by parsing [the games list](http://steamcommunity.com/my/games?tab=all) and [each game's achievement list](http://steamcommunity.com/my/stats/TF2/?tab=achievements), so will work on public or private profiles as long as they are accessible in the current session.
