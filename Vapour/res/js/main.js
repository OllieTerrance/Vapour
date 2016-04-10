function sortAlpha(a, b) {
    var aa = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    var bb = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return aa > bb ? 1 : (aa < bb ? -1 : 0);
}
var ajaxReqs = 0;
var ajaxQueue = [];
var ajaxActive = 0;
var ajaxMaxConc = 3;
function addAjax(obj) {
    ajaxReqs++;
    $("#nav-loading").toggle(ajaxReqs > 0).find("span").text(ajaxReqs);
    var oldSuccess = obj.success;
    var oldError = obj.error;
    var callback = function() {
        ajaxReqs--;
        if (ajaxActive === ajaxMaxConc) {
            $.ajax(ajaxQueue.shift());
        } else {
            ajaxActive--;
        }
        $("#nav-loading").toggle(ajaxReqs > 0).find("span").text(ajaxReqs);
    }
    obj.success = function(resp, xhr, status) {
        callback();
        if (oldSuccess) oldSuccess(resp, xhr, status);
    };
    obj.error = function(xhr, status, error) {
        callback();
        if (oldError) oldError(xhr, status, error);
    };
    if (ajaxActive === ajaxMaxConc) {
        ajaxQueue.push(obj);
    } else {
        ajaxActive++;
        $.ajax(obj);
    }
}
function getFriends(fn) {
    addAjax({
        "url": "https://steamcommunity.com/my/friends",
        "success": function(resp, xhr, status) {
            var friends = [];
            $(".friendBlock", resp).each(function(i, friend) {
                friends.push({
                    "id": $(friend).find("input.friendCheckbox").data("steamid"),
                    "name": $(friend).text().trim().split("\n")[0],
                    "url": $(friend).attr("href")
                });
            });
            friends.sort(sortAlpha);
            fn(friends);
        }
    });
}
function getGames(fn, user) {
    addAjax({
        "url": "https://steamcommunity.com/" + (user ? "profiles/" + user : "my") + "/games?tab=all",
        "success": function(resp, xhr, status) {
            var games = []
            $(JSON.parse(resp.match(/var rgGames = (.+);/)[1])).each(function(i, game) {
                games.push({
                    "id": game.appid,
                    "name": game.name,
                    "image": game.logo
                });
            });
            games.sort(sortAlpha);
            fn(games);
        }
    });
}
function getStats(fn, game, user) {
    addAjax({
        "url": "https://steamcommunity.com/" + (user ? "profiles/" + user : "my") + "/stats/" + game + "/?tab=achievements",
        "success": function(resp, xhr, status) {
            var stats = [];
            $(".achieveRow", resp).each(function(i, stat) {
                if ($(stat).find(".achieveHiddenBox").length) return;
                var statObj = {
                    "name": $(stat).find("h3").text(),
                    "image": $(stat).find("img").attr("src"),
                    "desc": $(stat).find("h5").text()
                };
                if ($(stat).find(".achieveUnlockTime").length) {
                    statObj.date = $(stat).find(".achieveUnlockTime").text().trim().substring(9).split(" @ ");
                }
                if ($(stat).find(".progressText").length) {
                    var parts = $(stat).find(".progressText").text().trim().split(/[^0-9]+/);
                    statObj.progress = parts.map(Number);
                }
                stats.push(statObj);
            });
            fn(stats);
        }
    });
}
$(document).ready(function() {
    $("#nav-profile").click(function(e) {
        if ($(this).parent().hasClass("active")) return;
        $("nav li.active").removeClass("active");
        $(this).parent().addClass("active");
        $("#pages > div").hide();
        $("#page-profile").show();
    }).click();
    $("#nav-friends").click(function(e) {
        if ($(this).parent().hasClass("active")) return;
        $("nav li.active").removeClass("active");
        $(this).parent().addClass("active");
        $("#pages > div").hide();
        $("#page-friends").show();
    });
    $("#page-profile").append($("<i>").addClass("fa fa-refresh fa-spin")).append(" Loading games...");
    getGames(function(games) {
        $("#page-profile").empty();
        var $list = $("<ul>");
        $(games).each(function(i, game) {
            var $gameElmt = $("<li>").text(game.name);
            $list.append($gameElmt);
            getStats(function(stats) {
                var $statsList = $("<ul>").addClass("fa-ul");
                $(stats).each(function(i, stat) {
                    var icon = stat.date ? "check-square-o" : (stat.progress ? "spinner" : "circle-o");
                    $statsList.append($("<li>").append($("<i>").addClass("fa fa-li fa-" + icon)).append(stat.name));
                });
                $gameElmt.append($statsList);
            }, game.id);
        });
        $("#page-profile").empty().append($list);
    });
    $("#page-friends").append($("<i>").addClass("fa fa-refresh fa-spin")).append(" Loading friends...");
    getFriends(function(friends) {
        $("#page-friends").empty();
        var $list = $("<div>").addClass("row");
        $(friends).each(function(i, friend) {
            $list.append($("<div>").addClass("col-lg-2 col-md-3 col-sm-4 col-xs-6").text(friend.name));
        });
        $("#page-friends").empty().append($list);
    });
});
