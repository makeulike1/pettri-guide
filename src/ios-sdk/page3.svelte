<script>
    import Code8 from "./code8.svelte"
    import Code9 from "./code9.svelte"
    import Code10 from "./code10.svelte"
    
</script>
<h3 class='head-text'>페트리 iOS 연동</h3>
<div class='title'>이벤트 분석</div>
앱에서 발생한 이벤트를 패트리 서버에 전송하여 성과 측정에 기여할 수 있습니다.
<Code8/>

<div class='text mg-top'>예를 들어서 회원 가입 이벤트에 대해서 전환을 측정하고자 한다면, 아래와 같이 회원 이벤트와 속성 정보를 정의할 수 있습니다.</div>
<Code9/>


<div class='text mg-top'>회원이 앱을 업데이트하였을 경우, 아래와 같이 속성 값을 커스터마이징하여 성과 측정에 기여할 수 있습니다.</div>
<Code10/>


<style>
 
</style>