// ==UserScript==
// @name        SMC effective monthly
// @author      mtoerpe
// @namespace   aws
// @description Calculates effective monthly rate and 3 YR totals by considering one-time payment
// @include     http://calculator.s3.amazonaws.com/index.html*
// @include     https://calculator.s3.amazonaws.com/index.html*
// @version     4.0.2
// @downloadURL https://github.com/frumania/aws-smc-reloaded/raw/master/smc_ri_monthly.user.js
// @updateURL   https://github.com/frumania/aws-smc-reloaded/raw/master/smc_ri_monthly.user.js
// @grant       none
// ==/UserScript==

setTimeout(function()
{

var innerHTML1 = `
    <td colspan="2" style="background-color: chartreuse;">
    <div class="gwt-HTML label" style="width: 475px" aria-hidden="false">Effective Total Monthly Payment (RI = One Time Payment / 36 months):</div>
    </td>
    <td colspan="2" style="background-color: chartreuse;">
        <table cellspacing="0" cellpadding="0" class="value">
        <tbody>
        <tr>
            <td align="left" style="vertical-align: middle;">
                <div class="gwt-Label">$</div>
            </td>
            <td align="left" style="vertical-align: middle;">
                <input id="smc-effective-monthly" type="text" class="gwt-TextBox gwt-TextBox-readonly" readonly="">
            </td>
        </tr>
        </tbody>
        </table>
    </td>
`;

var innerHTML2 = `
    <td colspan="2" style="background-color: chartreuse;">
    <div class="gwt-HTML label" style="width: 475px" aria-hidden="false">Effective Total 3 YR:</div>
    </td>
    <td colspan="2" style="background-color: chartreuse;">
        <table cellspacing="0" cellpadding="0" class="value">
        <tbody>
        <tr>
            <td align="left" style="vertical-align: middle;">
                <div class="gwt-Label">$</div>
            </td>
            <td align="left" style="vertical-align: middle;">
                <input id="smc-effective-3yr" type="text" class="gwt-TextBox gwt-TextBox-readonly" readonly="">
            </td>
        </tr>
        </tbody>
        </table>
    </td>
`;

var newDiv1 = document.createElement('tr');
newDiv1.setAttribute('class', 'total');
newDiv1.innerHTML = innerHTML1;
var node1 = document.getElementsByClassName('total');
node1.item(node1.length-1).parentElement.insertBefore(newDiv1, node1.item(node1.length));

var newDiv2 = document.createElement('tr');
newDiv2.setAttribute('class', 'total');
newDiv2.innerHTML = innerHTML2;
var node2 = document.getElementsByClassName('total');
node2.item(node2.length-1).parentElement.insertBefore(newDiv2, node2.item(node2.length));

var billLabel = document.getElementsByClassName('billLabel').item(0).parentElement;
billLabel.addEventListener("click", function () {
    calceffectmonthly();
});

function calceffectmonthly()
{
    //GET VALUES
    var totals = document.getElementsByClassName('total');
    total_ri = totals.item(2).getElementsByTagName('input').item(0);
    total_month = totals.item(3).getElementsByTagName('input').item(0);
    RI = total_ri.value;
    Month = total_month.value;

    result = parseFloat(RI)/36 + parseFloat(Month);

    yr3 = result * 36;

    //console.log(result);

    document.getElementById('smc-effective-monthly').value = result.toFixed(2);

    document.getElementById('smc-effective-3yr').value = yr3.toFixed(2);
}

calceffectmonthly();


}, 10000);