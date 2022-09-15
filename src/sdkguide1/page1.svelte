<script>
    import Code1 from "./code1.svelte"
    import Code2 from "./code2.svelte"
    import Code3 from "./code3.svelte"
    let leftbrace = "{"    
    let rightbrace = "}"

</script>

<h3 class='head-text'>페트리 연동하기[iOS]</h3>
<div class='title'>페트리 초기화</div>
<div class='text'></div>
코드에서 다음과 같이 페트리 SDK를 import하여 초기화합니다.

<Code1 leftbrace={leftbrace} rightbrace={rightbrace}/>

<div class='sub-title-1'>이벤트 업로드 주기 설정</div>
<div class='sub-title-2'>이벤트 개수 누적</div>
일정 개수의 이벤트가 발생되었을 때 페트리 서버로 측정된 이벤트 데이터를 업로드 하도록 합니다.

<Code2 leftbrace={leftbrace} rightbrace={rightbrace}/>
<Code3 leftbrace={leftbrace} rightbrace={rightbrace}/>