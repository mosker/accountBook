
function itemFormatter(value,row,index) {
    if(value != 0){
        return value.toFixed(2)
    }
}

function totalTextFormatter(data) {
    return '金额总计'
}

function totalAmountFormatter(data) {
    var field = this.field
    var sum = data.map(function (row) {
        return +row[field]
    }).reduce(function (sum, i) {
        return sum + i
    }, 0)
    return sum.toFixed(2)
}

export {
    itemFormatter,
    totalTextFormatter,
    totalAmountFormatter
}