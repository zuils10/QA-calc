Decimal.config({
    precision: 17
});
var manualInput = 0; //where to load data: 0 = from save game; 1 = manual input
var rawData = "";
var totalAS;
var hze;
var hs;
var hsSacrificed;
var tp;
var basePrimalRewards;
var totalBoss;
var hsCap;
var outsider = {
    "2": {
        "name": "Chor'gorloth",
        "level": Decimal(0),
        "multiplier": Decimal(0),
    },
    "3": {
        "name": "Phandoryss",
        "level": Decimal(0),
        "multiplier": Decimal(0),
    },
    "4": {
        "name": "Borb",
        "level": Decimal(0),
        "multiplier": Decimal(0),
    },
    "5": {
        "name": "Ponyboy",
        "level": Decimal(0),
        "multiplier": Decimal(0),
    },
}
var ancient = {
    "3": {
        "name": "Solomon",
        "level": Decimal(0),
        "relicid": 25,
        "bonusFromRelics": Decimal(0),
    },
    "13": {
        "name": "Atman",
        "level": Decimal(0),
        "relicid": 17,
        "bonusFromRelics": Decimal(0),
    },
}
var quest = [];

//FORMATS
function integerFormat(number) {
    if (number.lt(1e4))
        return number.toFixed(0);
    else
        return number.toExponential(4).replace("+", "");
}

function decimalFormat(number) {
    return number.toFixed(4);
}

function easyCopyFormat(num) {
    if (num.gte(100000)) {
        var rs = Decimal(num).toFixed(0);
        var x10 = 0;
        while (rs[rs.length - 1] === "0") {
            x10++;
            rs = rs.substring(0, rs.length - 1);
        }
        if (x10 == 0)
            return rs;
        else
            return (rs + 'e' + x10);
    } else
        return integerFormat(num);
}

//SUMMATIONS
function approSum(n) {
    var m = n.plus(1);
    var loc1 = m.sqrt();
    var loc2 = m.times(loc1);
    var loc3 = m.times(loc2).times(0.4);
    var loc4 = loc2.times(0.5);
    var loc5 = loc1.times(0.125);
    var loc6 = Decimal(0.00052).div(loc2);
    return loc3.minus(loc4).plus(loc5).minus(loc6).ceil();
}

//SUPPORT
function getSaveGame() {
    var SPLITTER = "Fe12NAfA3R6z4k0z";
    var ipData = $("#ipSaveGame").val();
    if (ipData.indexOf(SPLITTER) > 0) {
        ipData = ipData.split(SPLITTER)[0];
        var temp = "";
        for (var i = 0; i < ipData.length; i += 2)
            temp += ipData[i];
        rawData = JSON.parse(atob(temp));
    }
}

function getRelicBonus(id) {
    var level = Decimal(0);
    for (var i in rawData.items.slots) {
        if (i > 4)
            continue;
        var relic = rawData.items.items[rawData.items.slots[i]];
        for (var j = 1; j <= 4; j++) {
            if (relic["bonusType" + j] == id)
                level = level.plus(Decimal(relic['bonus' + j + 'Level']));
        }
    }
    return level;
}

function getSolomonEffect(solomonLevel) {
    var x;
    if (solomonLevel.lte(20))
        x = solomonLevel.times(0.05);
    else if (solomonLevel.lte(40))
        x = solomonLevel.times(0.04).plus(0.2);
    else if (solomonLevel.lte(60))
        x = solomonLevel.times(0.03).plus(0.6);
    else if (solomonLevel.lte(80))
        x = solomonLevel.times(0.02).plus(1.2);
    else
        x = solomonLevel.times(0.01).plus(2);
    return x.times(outsider[5].multiplier.plus(1));
}

function getPrimalChance(atmanLevel) {
    return atmanLevel.times(-0.013).exp().neg().plus(1).times(0.75).plus(0.25);
}

function getBasePrimalRewards(param1) {
    var x = Decimal(0);
    for (var i = Decimal(1); i.lte(param1); i = i.plus(1)) {
        x = x.plus(i.plus(4).div(5).pow(1.3));
    }
    return x;
}

function getQA(solomonLevel, atmanLevel) {
    var bossUnderCap = Decimal.min(totalBoss, Decimal.log(hsCap.div(20).div(getSolomonEffect(solomonLevel).plus(1))).div(Decimal.log(tp.plus(1))).ceil());
    var bossOverCap = totalBoss.minus(bossUnderCap);
    var baseTPRewards = Decimal(20).times(tp.plus(1).pow(bossUnderCap.plus(1)).minus(1).div(tp));
    var qa = baseTPRewards.plus(basePrimalRewards).times(getSolomonEffect(solomonLevel).plus(1)).plus(hsCap.times(bossOverCap)).times(getPrimalChance(atmanLevel));
    return qa;
}

function getNewSolomon(currentSolomonLevel, hsForSolomon) {
    var left = currentSolomonLevel;
    var right = hsForSolomon.times(2.5).div(Decimal(1).plus(outsider[2].multiplier)).pow(0.4).plus(currentSolomonLevel).ceil();
    while (right.minus(left).gt(Decimal.max(1, right.times(1e-15)))) {
        var mid = right.plus(left).div(2).floor();
        var tempCost = approSum(mid).minus(approSum(currentSolomonLevel)).times(Decimal(1).plus(outsider[2].multiplier)).ceil();
        if (tempCost.lte(hsForSolomon))
            left = mid;
        else
            right = mid;
    }
    return left;
}

function getHighestAtman(currentAtmanLevel, hsForAtman) {
    var left = currentAtmanLevel;
    var right = Decimal.log(hsForAtman.div(Decimal(1).plus(outsider[2].multiplier))).div(Decimal.log(2)).ceil().plus(left);
    while (right.minus(left).gt(1)) {
        var mid = right.plus(left).div(2).floor();
        var tempCost = Decimal.pow(2, mid.plus(1)).minus(Decimal.pow(2, currentAtmanLevel.plus(1))).times(Decimal(1).plus(outsider[2].multiplier)).ceil();
        if (tempCost.lte(hsForAtman))
            left = mid;
        else
            right = mid;
    }
    return left;
}
//load and show game data
function loadGame() {
    getSaveGame();
    var output = "";
    totalAS = Decimal(rawData.ancientSoulsTotal);
    output += "Total AS: " + totalAS + "<br>";
    for (var i = 2; i <= 5; i++) {
        outsider[i].level = Decimal(rawData.outsiders.outsiders[i].level);
        switch (i) {
            case 2:
                outsider[i].multiplier = Decimal(1).minus(Decimal.pow(0.95, outsider[i].level)).neg();
                output += outsider[i].name + ": " + outsider[i].level + " (" + outsider[i].multiplier.times(100).toFixed(2) + "%)<br>";
                break;
            case 3:
                outsider[i].multiplier = Decimal(50).minus(outsider[i].level.neg().div(1000).exp().times(50));
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.toFixed(2) + "%)<br>";
                break;
            case 4:
                outsider[i].multiplier = outsider[i].level.div(10);
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.times(100).toFixed(0) + "%)<br>";
                break;
            case 5:
                outsider[i].multiplier = outsider[i].level;
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.times(100).toFixed(0) + "%)<br>";
                break;
        }
    }
    hs = Decimal(rawData.heroSouls);
    if ($("#useNextAscensionSouls").prop("checked"))
        hs = hs.plus(Decimal(rawData.primalSouls));
    for (var i in ancient) {
        ancient[i].level = Decimal(rawData.ancients.ancients[i].level).round();
        ancient[i].bonusFromRelics = getRelicBonus(ancient[i].relicid);
    }
    output += "Hero Souls: " + integerFormat(hs) + "<br>";
    output += "Atman: " + integerFormat(ancient[13].level) + " + " + decimalFormat(ancient[13].bonusFromRelics) + "<br>";
    output += "Solomon: " + integerFormat(ancient[3].level) + " + " + decimalFormat(ancient[3].bonusFromRelics) + "<br>";
    hsSacrificed = Decimal(rawData.heroSoulsSacrificed);
    hze = Decimal(rawData.highestFinishedZonePersist);
    output += "HS sacrificed: " + integerFormat(hsSacrificed) + "<br>";
    
    //get HS quests
    quest = [];
    var mercs = rawData.mercenaries.mercenaries;
    var rarityMult = [, 0.5, 0.75, 1, 2, 5, 20, 50, 200];
    var currentTime = new Date().getTime();
    for (var i in mercs) {
        if ((mercs[i].lastQuestRewardType == 3) && (Number(mercs[i].lastQuestStartTime) + Number(mercs[i].lastQuestDuration)*1000 <= currentTime)) {
            var reward = Decimal(mercs[i].lastQuestRewardQty * mercs[i].level);
            if (mercs[i].statId == 2)
                reward = reward.times(1 + 0.1 * rarityMult[mercs[i].rarity]);
            reward = reward.times(100).toDP(2).div(100);
            quest.push(reward);
        }
    }
    quest.sort(function(a,b) {
        return a.gte(b);
    });
    
    tp = Decimal(50).minus(totalAS.div(10000).neg().exp().times(49)).plus(outsider[3].multiplier).div(100);
    totalBoss = hze.minus(100).div(5).floor();
    hsCap = hsSacrificed.div(20).times(outsider[4].multiplier.plus(1));
    basePrimalRewards = getBasePrimalRewards(totalBoss);
    var qa = getQA(ancient[3].level.plus(ancient[3].bonusFromRelics), ancient[13].level.plus(ancient[13].bonusFromRelics));
    output += "QA: " + integerFormat(qa) +"<br>";
    output += "Available Quests: " + quest.join(', ');
    
    $("#result1").html(output);
}

function loadManualInput() {
    getSaveGame();
    var output = "";
    totalAS = Decimal($("#miTotalAS").val());
    output += "Total AS: " + totalAS + "<br>";
    for (var i = 2; i <= 5; i++) {
        outsider[i].level = Decimal($("#miOsd"+i.toString()).val());
        switch (i) {
            case 2:
                outsider[i].multiplier = Decimal(1).minus(Decimal.pow(0.95, outsider[i].level)).neg();
                output += outsider[i].name + ": " + outsider[i].level + " (" + outsider[i].multiplier.times(100).toFixed(2) + "%)<br>";
                break;
            case 3:
                outsider[i].multiplier = Decimal(50).minus(outsider[i].level.neg().div(1000).exp().times(50));
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.toFixed(2) + "%)<br>";
                break;
            case 4:
                outsider[i].multiplier = outsider[i].level.div(10);
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.times(100).toFixed(0) + "%)<br>";
                break;
            case 5:
                outsider[i].multiplier = outsider[i].level;
                output += outsider[i].name + ": " + outsider[i].level + " (+" + outsider[i].multiplier.times(100).toFixed(0) + "%)<br>";
                break;
        }
    }
    hs = Decimal($("#miCurrentHS").val());
    for (var i in ancient) {
        ancient[i].level = Decimal($("#miAcn"+i.toString()).val());
        ancient[i].bonusFromRelics = Decimal($("#miAcn"+i.toString()+"Relics").val());
    }
    output += "Hero Souls: " + integerFormat(hs) + "<br>";
    output += "Atman: " + integerFormat(ancient[13].level) + " + " + decimalFormat(ancient[13].bonusFromRelics) + "<br>";
    output += "Solomon: " + integerFormat(ancient[3].level) + " + " + decimalFormat(ancient[3].bonusFromRelics) + "<br>";
    hsSacrificed = Decimal($("#miSacrificedHS").val());
    hze = Decimal($("#miHZE").val());
    output += "HS sacrificed: " + integerFormat(hsSacrificed) + "<br>";
    tp = Decimal(50).minus(totalAS.div(10000).neg().exp().times(49)).plus(outsider[3].multiplier).div(100);

    //get HS quests
    quest = [];
    for (var i=0; i<5; i++) {
        var temp = $("#miQuest_" + i).val();
        if ($.isNumeric(temp)) {
            temp=Decimal(temp).div(100);
            quest.push(temp);
        }
    }
    quest.sort(function(a,b) {
        return a.gte(b);
    });

    totalBoss = hze.minus(100).div(5).floor();
    hsCap = hsSacrificed.div(20).times(outsider[4].multiplier.plus(1));
    basePrimalRewards = getBasePrimalRewards(totalBoss);
    var qa = getQA(ancient[3].level.plus(ancient[3].bonusFromRelics), ancient[13].level.plus(ancient[13].bonusFromRelics));
    output += "QA: " + integerFormat(qa) + "<br>";
    output += "Available Quests: " + quest.join(', ');

    $("#result1").html(output);
}

//maximize QA by leveling Atman and Solomon
function optimizeQA(atman, solomon, hs) {
    var output1 = "";
    var bestAtman = atman;
    var bestSolomon = solomon;
    var bestQA = getQA(solomon.plus(ancient[3].bonusFromRelics), atman.plus(ancient[13].bonusFromRelics));
    var highestAtman = getHighestAtman(atman, hs);
    for (var i = highestAtman; i.gte(atman); i = i.minus(1)) {
        var newAtman = i;
        var costAtman = Decimal.pow(2, newAtman.plus(1)).minus(Decimal.pow(2, atman.plus(1))).times(Decimal(1).plus(outsider[2].multiplier)).ceil();
        var newSolomon = getNewSolomon(solomon, hs.minus(costAtman));
        var newQA = getQA(newSolomon.plus(ancient[3].bonusFromRelics), newAtman.plus(ancient[13].bonusFromRelics));
        output1 += "Atman: " + newAtman + " (+" + newAtman.minus(atman) + "), Solomon: " + integerFormat(newSolomon) + " (+" + newSolomon.minus(solomon) + "), QA: " + integerFormat(newQA) + "<br>";
        if (newQA.gt(bestQA)) {
            bestAtman = newAtman;
            bestSolomon = newSolomon;
            bestQA = newQA;
        } else
            break;
    }
    $("#result2").append("Atman: " + bestAtman + " (+" + bestAtman.minus(atman) + "), Solomon: " + integerFormat(bestSolomon) + " (+" + easyCopyFormat(bestSolomon.minus(solomon)) + "), QA: " + integerFormat(bestQA) + "<br>");
    $("#result3").append(output1 + "<br>");
    var output = [bestAtman, bestSolomon, bestQA];
    return output;
}

$(document).ready(function() {
    
    $("#buttonSwitch").click(function() {
		manualInput=(manualInput+1)%2;
		$("#inputMode"+manualInput.toString()).show();
		$("#inputMode"+(1-manualInput).toString()).hide();
		if (manualInput==1)
			$(this).html('USE SAVE GAME');
		else
			$(this).html('MANUAL INPUT');
	});
	$("#buttonLoad").click(function() {
        if (manualInput==0)
			loadGame();
		else
			loadManualInput();
        $("#result2").empty();
        $("#result3").empty();
        var input = [ancient[13].level, ancient[3].level, 0];
        var input_hs = hs;
        for (var i=0; i<=quest.length; i++) {
            $("#result2").append("<b>Quick Ascension #" + (1+i) + " (HS: " + integerFormat(input_hs) + "):</b><br>");
            $("#result3").append("<b>Tests of Quick Ascension #" + (1+i) + ":</b><br>");
            input = optimizeQA(input[0], input[1], input_hs);
            if (i<quest.length)
                input_hs = input[2].times(quest[i]);
            else
                break;
        }
    });
});
