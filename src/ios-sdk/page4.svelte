<script>
    import Code5 from "./code5.svelte"
    import Code6 from "./code6.svelte"
    import Code7 from "./code7.svelte"
    import Code9 from "./code9.svelte";
    let leftbrace = "{"    
    let rightbrace = "}"
</script>
<h3 class='head-text'>페트리 iOS 연동</h3>
<div class='title'>회원 분석</div>

<div class='sub-title-1 no-mgtop'>로그인 / 로그아웃</div>
딥 링크가 오픈되는 시점에 다음과 같이 트래킹 코드를 추가하여, 패트리에 딥 링크가 오픈되었음을 알립니다.

<Code6 leftbrace={leftbrace} rightbrace={rightbrace}/>

<div class='sub-title-1'>회원 정보</div>
회원에 대해서 파악가능한 지표를 페트리 서버에 업데이트하여 분석에 활용할 수 있습니다.

<Code5/>

<div class='sub-title-1'>회원 가입</div>
회원이 신규로 가입할 때 이벤트 callback을 발생시켜 페트리 서버로 전송할 수 있습니다. 가입시 저장되는 정보는 UserProperties로 저장되는 정보와 무관하며 페트리 서버에 별개로 저장이 됩니다.

<Code9/>



<div class='sub-title-1'>위치 정보</div>
현재 회원의 위치 정보를 페트리 서버에 전송하여 분석에 활용할 수 있습니다.

<Code7/>