const url               = new URL(window.location.href)

function closeMenu(){
    window.$('#left-menu').hide()
    window.$('#main').css('left','0px')
    window.$('#open-menu').show();
}


function openMenu(){
    window.$('#left-menu').show()
    window.$('#main').css('left','350px')
    window.$('#open-menu').hide();

}


 
// 배열에서 항목 삭제 
function popElement(arr, key){
    var itemIndex = arr.indexOf(key)
    arr.splice(itemIndex, 1)
    return arr
}


// 배열에 항목 추가 
function pushElement(arr, key){
    arr.push(key)
    return arr;
}