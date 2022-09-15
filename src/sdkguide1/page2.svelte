<script>
    import Code4 from "./code4.svelte"
    let leftbrace = "{"    
    let rightbrace = "}"
</script>
<h3 class='head-text'>페트리 연동하기[iOS]</h3>
<div class='title'>딥 링크 이벤트 분석</div>
딥 링크가 오픈되는 시점에 페트리 트래킹 코드를 호출함으로써, 콘솔에서 딥 링크 발생 이벤트에 대한 추적이 가능합니다.
<div class='sub-title-1 no-mgtop'>링크 오픈 시점</div>
딥 링크가 오픈되는 시점에 다음과 같이 트래킹 코드를 추가하여, 패트리에 딥 링크가 오픈되었음을 알립니다.

<Code4 leftbrace={leftbrace} rightbrace={rightbrace}/>