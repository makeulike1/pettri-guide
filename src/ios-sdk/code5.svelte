<script>
</script>
<div class='code'>
    <br>
    <div class='remark'>// 페트리 객체를 불러옵니다.</div>
    <div class='line'>let pettri = Pettri.getInstance</div>
    <br>
    <div class='remark'>// 회원 속성 정보 클래스를 신규로 선언합니다.</div>
    <div class='line'>let UserProperties = PettriUserProperties()</div>
    <br>
    <div class='remark'>// 회원을 파악할수 있는 정보를 Integer, String, Boolean 타입의 데이터를 Key/Value의 형태로 저장합니다.</div>
    <div class='line'>
        UserProperties.setIntegerData("age", 34)
        <br>
        UserProperties.setStringData("name", "pettri")
        <br>
        UserProperties.setBooleanData("married", false)
    </div>
    <br>
    <div class='remark'>// 선언된 회원 속성 객체를 페트리 모듈에 저장하도록 합니다.</div>
    <div class='line'>
        pettri.setUserProperties(UserProperties)
    </div>
    <br>
    <div class='line'>return true</div>
    <br>
</div>