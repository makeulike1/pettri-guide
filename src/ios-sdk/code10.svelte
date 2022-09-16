<script>
</script>
<div class='code'>
    <br>
    <div class='remark'>// 페트리 객체를 불러옵니다.</div>
    <div class='line'>let pettri = Pettri.getInstance</div>
    <br>
    <br>
    <div class='remark'>// 앱이 업데이트 될 때 참조되는 데이터들을 선별하여 속성값으로 저장합니다.</div>
    <div class='line'>
        let eventProps = PettriEventProperties()
        <br>
        eventProps.setStringData("prev_ver", "0.0.1")
        <br>
        eventProps.setStringData("updated_ver", "0.0.2")
        <br>
        
    </div>
    <br>
    <br>
    <div class='remark'>// 선언된 속성값을 패트리 서버에 전송합니다. </div>
    <div class='line'>
        pettri.sendEvent(name: "app_update", value: eventProps)
    </div>

    <br>
    <br>
    <div class='line'>return true</div>
    <br>
</div>