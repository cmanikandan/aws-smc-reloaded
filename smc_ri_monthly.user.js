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
                <input id="smc-effective-monthly" type="text" class="gwt-TextBox gwt-TextBox-readonly" readonly="">
            </td>
        </tr>
        </tbody>
        </table>
    </td>
`;

var newDiv = document.createElement('tr');
newDiv.setAttribute('class', 'total');
newDiv.innerHTML = innerHTML1;
var node = document.getElementsByClassName('total');
node.item(node.length-1).parentElement.insertBefore(newDiv, node.item(node.length));

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

    console.log(result);

    var resultNode = document.getElementById('smc-effective-monthly').value = result.toFixed(2);
}

calceffectmonthly();


}, 10000);