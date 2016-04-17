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
        if (ajaxActive === ajaxMaxConc && ajaxQueue.length) {
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
            if (!user) user = resp.match(/g_steamID = "([0-9]+)"/)[1];
            var games = []
            $(JSON.parse(resp.match(/var rgGames = (.+);/)[1])).each(function(i, game) {
                games.push({
                    "id": game.appid,
                    "urlId": game.friendlyURL,
                    "name": game.name,
                    "image": game.logo,
                    "hours": parseFloat(game.hours_forever) || 0.0,
                    "achievements": game.availStatLinks.achievements
                });
            });
            games.sort(sortAlpha);
            fn({
                "user": user,
                "games": games
            });
        }
    });
}
function getAchieves(fn, game, user) {
    addAjax({
        "url": "https://steamcommunity.com/" + (user ? "profiles/" + user : "my") + "/stats/" + game + "/?tab=achievements",
        "success": function(resp, xhr, status) {
            var achieves = [];
            $(".achieveTxtHolder", resp).each(function(i, achieve) {
                if ($(achieve).prev().hasClass("achieveHiddenBox")) {
                    for (var i = 0; i < parseInt($(achieve).prev().text()); i++) achieves.push({});
                    return;
                }
                var achieveObj = {
                    "name": $(achieve).find("h3").text(),
                    "image": $(achieve).prev().find("img").attr("src"),
                    "desc": $(achieve).find("h5").text()
                };
                if ($(achieve).find(".achieveUnlockTime").length) {
                    achieveObj.date = $(achieve).find(".achieveUnlockTime").text().trim().substring(9).split(" @ ");
                }
                if ($(achieve).find(".progressText, .progressFloatRight").length) {
                    var parts = $(achieve).find(".progressText, .progressFloatRight").text().trim().replace(/[\.,]/g, "").split(/[^0-9]+/);
                    var prog = parts.map(Number);
                    if (!(prog[0] === 0 && prog[1] === 1)) achieveObj.progress = prog;
                }
                achieves.push(achieveObj);
            });
            fn(achieves);
        }
    });
}
$(document).ready(function() {
    chrome.storage.local.get(function(store) {
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
        getGames(function(userGames) {
            var $page = $("#page-profile").empty();
            $(userGames.games).each(function(i, game) {
                var label = game.hours ? [game.hours < 0.5 ? "warning" : "success", game.hours + " hours"] : ["danger", "Unplayed"];
                var $head = $("<div>").addClass("panel-heading").text(game.name + " ")
                    .append($("<span>").addClass("label label-" + label[0]).text(label[1]));
                var $body = $("<div>").addClass("panel-body");
                if (game.achievements) {
                    var key = userGames.user + "/" + game.id;
                    var callback = function(achieves) {
                        chrome.storage.local.set({[key]: achieves});
                        if (!achieves.length) {
                            $body.text("Nothing to see here.");
                            return;
                        }
                        var counts = [0, 0, 0];
                        var $achievesYes = $("<ul>").addClass("fa-ul");
                        var $achievesNo = $("<ul>").addClass("fa-ul");
                        $(achieves).each(function(i, achieve) {
                            var type = achieve.date ? 0 : (achieve.progress && achieve.progress[0] ? 1 : 2);
                            counts[type]++;
                            var icon = type === 0 ? "check-square-o" : "circle-o";
                            var $achieve = $("<li>").toggleClass("text-muted", !achieve.name)
                                .append($("<i>").addClass("fa fa-li fa-" + icon + " text-" + ["success", "warning", "danger"][type]))
                                .append(achieve.name || "[a secret achievement]");
                            if (achieve.progress) $achieve.append($("<span>").addClass("text-warning")
                                .text(" " + achieve.progress.join("/") + " (" + Math.round((achieve.progress[0] / achieve.progress[1]) * 100) + "%)"));
                            (achieve.date ? $achievesYes : $achievesNo).append($achieve);
                        });
                        $head
                            .prepend($("<div>").addClass("progress pull-right").css("width", "200px")
                                .append($("<div>").addClass("progress-bar progress-bar-success")
                                    .css("width", ((counts[0] / achieves.length) * 100) + "%"))
                                .append($("<div>").addClass("progress-bar progress-bar-warning")
                                    .css("width", ((counts[1] / achieves.length) * 100) + "%"))
                                .append($("<div>").addClass("progress-bar progress-bar-danger")
                                    .css("width", ((counts[2] / achieves.length) * 100) + "%")));
                        $body.empty().append($("<div>").addClass("row")
                            .append($("<div>").addClass("col-sm-6")
                                .append($achievesYes))
                            .append($("<div>").addClass("col-sm-6")
                                .append($achievesNo)));
                    };
                    if (store[key]) {
                        callback(store[key]);
                    } else {
                        $body.text("Fetching achievements...");
                        getAchieves(callback, game.urlId);
                    }
                } else {
                    $body.text("Nothing to see here.");
                }
                $page.append($("<div>").addClass("panel panel-dark")
                    .append($head)
                    .append($body));
            });
        });
        $("#page-friends").append($("<i>").addClass("fa fa-refresh fa-spin")).append(" Loading friends...");
        getFriends(function(friends) {
            var $list = $("<div>").addClass("row");
            $("#page-friends").empty().append($list);
            $(friends).each(function(i, friend) {
                $list.append($("<div>").addClass("col-md-3 col-sm-4 col-xs-6")
                    .append($("<div>").addClass("panel panel-dark")
                        .append($("<div>").addClass("panel-body").text(friend.name))));
            });
        });
    });
});
