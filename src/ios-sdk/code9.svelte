<script>
</script>
<div class='code'>
    <br>
    <div class='remark'>// 페트리 객체를 불러옵니다.</div>
    <div class='line'>let pettri = Pettri.getInstance</div>
    <br>
    <br>
    <div class='remark'>// 회원 가입 이벤트시 발생되는 정보에 대해서, 속성 객체를 신규로 생성합니다. </div>
    <div class='line'>
        let eventProps = PettriEventProperties()
        <br>
        eventProps.setIntegerData("age", 34)
        <br>
        eventProps.setStringData("email", "pettri@pettri.com")
        <br>
        eventProps.setStringData("lv", 1)
        <br>
        
    </div>
    <br>
    <br>
    <div class='remark'>// 회원 가입이 발생하면 선언된 속성값을 패트리 서버에 전송합니다. </div>
    <div class='line'>
        pettri.sendEvent(name: "signup", value: eventProps)
    </div>

    <br>
    <br>
    <div class='line'>return true</div>
    <br>
</div>