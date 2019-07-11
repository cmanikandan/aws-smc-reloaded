// ==UserScript==
// @name        SMC RI Automator
// @author      maitreyr, elsenhuc, mtoerpe
// @namespace   aws
// @description Allows mass change of billing type (On-Demand <-> RIs)
// @version     3.0.0
// @grant       none
// @include     http://calculator.s3.amazonaws.com/index.html*
// @include     https://calculator.s3.amazonaws.com/index.html*
// @downloadURL hhttps://drive.corp.amazon.com/view/mtoerpe@/public/smc/smc_ri_switch.user.js
// @updateURL   https://drive.corp.amazon.com/view/mtoerpe@/public/smc/smc_ri_switch.user.js
// ==/UserScript==

var SCENARIOS = ['On-Demand',
                '1-yr NU RI',
                '1-yr PU RI',
                '1-yr AU RI',
                '3-yr NU RI',
                '3-yr PU RI',
                '3-yr AU RI',
                '1-yr NU Conv',
                '1-yr PU Conv',
                '1-yr AU Conv',
                '3-yr NU Conv',
                '3-yr PU Conv',
                '3-yr AU Conv'
                ];

var innerHTML = "";

function generateTable() {
    innerHTML = "<table style='width:200px'><tr><td><span>Usage&gt;</span><input type='text' maxlength='3' size='3' id='usagethreshold'></input></td><td><select id='make-ri-select'>"
    // add the buttons to the inner HTML
    for(var i = 0, len = SCENARIOS.length; i < len; ++i) {
        innerHTML += addOption(SCENARIOS[i], i);
    }
    innerHTML += "</select></td></tr></table>";
    return innerHTML;
}

function addOption(caption, idx) {
    return '<option id="make-ri-' + idx + '" value="' + caption + '">' + caption + '</option>';
}

//console.log('InnerHTML=' + innerHTML);

var newDiv = document.createElement('div');
newDiv.setAttribute('id', 'smc-ri-buttons');
newDiv.setAttribute('style', 'background-color: chartreuse;padding:10px;');
newDiv.innerHTML = generateTable();
var language = document.getElementById('aws-calculator');
language.parentNode.insertBefore(newDiv, language);

//START CHANGE MARCEL
// set the callback function for click event for each button
/*for(var i = 0, len = SCENARIOS.length; i < len; ++i) {
    document.getElementById('make-ri-' + i).addEventListener('click', makeRI, false);
}*/

document.getElementById('make-ri-select').addEventListener('change', makeRI, false);
//END CHANGE MARCEL

function NSResolver(prefix) {
    return 'http://www.w3.org/1999/xhtml';
}

function triggerEvent(node, eventType) {
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent(eventType, true, true);
    //console.log('Dispatching event ' + eventType);
    node.dispatchEvent(clickEvent);
}

function makeRI() {
    //START CHANGE MARCEL
    //var id = event.target.id;
    var id = document.getElementById("make-ri-select").value;
    console.log(id);
    //END CHANGE MARCEL

    var usageData = [];
    var thresholdfield = document.getElementById('usagethreshold');
    var threshold = (thresholdfield.value === '' ? 0 : parseInt(thresholdfield.value));
    //console.log('Button ID = ' + id);

    //START CHANGE MARCEL
    //var scenario = parseInt(id.split('-') [2]);
    var scenario = SCENARIOS.indexOf(id);
    console.log(scenario);
    //END CHANGE MARCEL

    var query = '//table[contains(@class,"SF_EC2_INSTANCE_FIELD_USAGE")]//input[@type="text"]';
    //console.log('Query = ' + query);
    var fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //console.log('Found ' + fields.snapshotLength + ' input fields = ' + fields);
    for (var k = 0; k < fields.snapshotLength; ++k) {
        var usageVal = fields.snapshotItem(k).value;
        usageData.push(usageVal);
        //console.log('instance usage: ' + usageVal);
    }

    // find instance table
    query = '//div[contains(@class,"SF_COMMON_FIELD_BILLING")]/../..//div[@role="button"]';
    //console.log('Querying for billing fields');
    fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    //console.log(fields);
    for (var i = 0; i < fields.snapshotLength; ++i) {
        var button = fields.snapshotItem(i);
        if (usageData[i] > threshold) {
            console.log('Making RI with scenario ' + scenario);
            //console.log('Found the button');
            //console.log(button);
            triggerEvent(button, 'mouseover');
            triggerEvent(button, 'mousedown');
            triggerEvent(button, 'mouseup');
            handleDialog(scenario);
        } else {
            console.log('Making on-demand with threshold ' + threshold);
            //console.log('Found the button');
            //console.log(button);
            triggerEvent(button, 'mouseover');
            triggerEvent(button, 'mousedown');
            triggerEvent(button, 'mouseup');
            handleDialog(0);
        }
    }
}

function handleDialog(scenario) {
    var query = '//input[@name="SelectorDialogType"]';
    var fields = document.evaluate(query, document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    //console.log(fields);
    // find the third element
    var button;
    for (var i = 0; i <= scenario; ++i) {
        button = fields.iterateNext();
    }
    //console.log('Found the radio input');
    //console.log(button);
    button.click();
    fields = document.evaluate('//button[contains(text(),"Close and Save")]', document, NSResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    var closeButton = fields.iterateNext();
    //console.log('Found the close and save button');
    //console.log(closeButton);
    triggerEvent(closeButton, 'click');
}